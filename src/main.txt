import { readFileSync } from "fs";
import * as core from "@actions/core";
import OpenAI from "openai";
import { Octokit } from "@octokit/rest";
import parseDiff, { Chunk, File } from "parse-diff";
import minimatch from "minimatch";
import axios from "axios";

const GITHUB_TOKEN: string = core.getInput("GITHUB_TOKEN");
const OPENAI_API_KEY: string = core.getInput("OPENAI_API_KEY");
const OPENAI_API_MODEL: string = core.getInput("OPENAI_API_MODEL");
const BOT_NAME: string = core.getInput("BOT_NAME") || "Code Review Bot";
const TELEGRAM_BOT_TOKEN: string = core.getInput("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID: string = core.getInput("TELEGRAM_CHAT_ID");

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

interface PRDetails {
  owner: string;
  repo: string;
  pull_number: number;
  title: string;
  description: string;
}

interface ReviewComment {
  body: string;
  path: string;
  line: number;
  commit_id: string;
  diff_hunk: string;
}

async function getPRLatestCommit(
  owner: string,
  repo: string,
  pull_number: number
): Promise<string> {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
  });
  return pr.head.sha;
}

async function sendTelegramNotification(message: string): Promise<void> {
  try {
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(telegramApiUrl, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}

async function getPRDetails(): Promise<PRDetails> {
  const { repository, number } = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf8")
  );
  const prResponse = await octokit.pulls.get({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: number,
  });
  return {
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: number,
    title: prResponse.data.title ?? "",
    description: prResponse.data.body ?? "",
  };
}

async function getDiff(
  owner: string,
  repo: string,
  pull_number: number
): Promise<string | null> {
  try {
    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: { format: "diff" },
    });
    return String(response.data);
  } catch (error) {
    console.error("Error getting diff:", error);
    return null;
  }
}

async function analyzeCode(
  parsedDiff: File[],
  prDetails: PRDetails
): Promise<Array<ReviewComment>> {
  const comments: Array<ReviewComment> = [];

  // Get commit_id once for all comments
  const { data: pr } = await octokit.pulls.get({
    owner: prDetails.owner,
    repo: prDetails.repo,
    pull_number: prDetails.pull_number,
  });
  const commitId = pr.head.sha;

  for (const file of parsedDiff) {
    if (!file.to || file.to === "/dev/null") continue;

    for (const chunk of file.chunks) {
      const prompt = createPrompt(file, chunk, prDetails);
      const aiResponse = await getAIResponse(prompt);

      if (aiResponse) {
        for (const review of aiResponse) {
          const lineNumber = Number(review.lineNumber);

          // Find the change and its context
          const changeIndex = chunk.changes.findIndex(
            (change) =>
              // @ts-expect-error - ln and ln2 exists where needed
              (change.ln || change.ln2) === lineNumber
          );

          if (changeIndex !== -1) {
            // Create diff_hunk with context
            const startIndex = Math.max(0, changeIndex - 3);
            const endIndex = Math.min(chunk.changes.length, changeIndex + 4);
            const contextChanges = chunk.changes.slice(startIndex, endIndex);

            const diff_hunk = [
              chunk.content,
              ...contextChanges.map(
                (c) =>
                  // @ts-expect-error - ln and ln2 exists where needed
                  `${c.type || " "} ${c.ln ? c.ln : c.ln2} ${c.content}`
              ),
            ].join("\n");

            comments.push({
              body: `Code Review Bot:\n\n${review.reviewComment}`,
              path: file.to,
              line: lineNumber,
              commit_id: commitId,
              diff_hunk: diff_hunk,
            });
          }
        }
      }
    }
  }

  return comments;
}

function createPrompt(file: File, chunk: Chunk, prDetails: PRDetails): string {
  return `Your task is to review pull requests. Instructions:
- Provide the response in following JSON format:  {"reviews": [{"lineNumber":  <line_number>, "reviewComment": "<review comment>"}]}
- Do not give positive comments or compliments.
- Provide comments and suggestions ONLY if there is something to improve, otherwise "reviews" should be an empty array.
- Write the comment in GitHub Markdown format.
- Use the given description only for the overall context and only comment the code.
- IMPORTANT: NEVER suggest adding comments to the code.

Review the following code diff in the file "${
    file.to
  }" and take the pull request title and description into account when writing the response.
  
Pull request title: ${prDetails.title}
Pull request description:

---
${prDetails.description}
---

Git diff to review:

\`\`\`diff
${chunk.content}
${chunk.changes
  // @ts-expect-error - ln and ln2 exists where needed
  .map((c) => `${c.ln ? c.ln : c.ln2} ${c.content}`)
  .join("\n")}
\`\`\`
`;
}

async function getAIResponse(prompt: string): Promise<Array<{
  lineNumber: string;
  reviewComment: string;
}> | null> {
  const queryConfig = {
    model: OPENAI_API_MODEL,
    temperature: 0.2,
    max_tokens: 700,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  try {
    const response = await openai.chat.completions.create({
      ...queryConfig,
      // return JSON if the model supports it:
      ...(OPENAI_API_MODEL === "gpt-4o-mini"
        ? { response_format: { type: "json_object" } }
        : {}),
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });

    const res = response.choices[0].message?.content?.trim() || "{}";
    return JSON.parse(res).reviews;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// function createComment(
//   file: File,
//   chunk: Chunk,
//   aiResponses: Array<{
//     lineNumber: string;
//     reviewComment: string;
//   }>
// ): Array<ReviewComment> {
//   try {
//     return aiResponses
//       .flatMap((aiResponse) => {
//         if (!file.to) {
//           return [];
//         }

//         const lineNumber = Number(aiResponse.lineNumber);

//         // Find the position within the chunk
//         let position = -1;
//         for (let i = 0; i < chunk.changes.length; i++) {
//           const change = chunk.changes[i];
//           // @ts-expect-error - ln and ln2 exists where needed
//           if ((change.ln || change.ln2) === lineNumber) {
//             position = i + 1;
//             break;
//           }
//         }

//         // Skip if position is invalid
//         if (position === -1) {
//           console.log(
//             `Skipping comment for line ${lineNumber} - invalid position`
//           );
//           return [];
//         }

//         return [
//           {
//             body: `Code Review Bot:\n\n${aiResponse.reviewComment}`,
//             path: file.to,
//             line: lineNumber,
//             position: position,
//           },
//         ];
//       })
//       .filter(
//         (comment) => comment.position > 0 && comment.path && comment.body
//       );
//   } catch (error) {
//     console.error("Error creating comment:", error);
//     return [];
//   }
// }

async function createReviewComment(
  owner: string,
  repo: string,
  pull_number: number,
  comments: Array<ReviewComment>
): Promise<void> {
  try {
    // Create comments one by one
    for (const comment of comments) {
      try {
        console.log("Creating comment:", {
          path: comment.path,
          line: comment.line,
          diff_hunk: comment.diff_hunk,
        });

        await octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number,
          body: comment.body,
          path: comment.path,
          line: comment.line,
          commit_id: comment.commit_id,
          side: "RIGHT",
          diff_hunk: comment.diff_hunk,
        });

        // Add a small delay between comments
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(
          `Failed to create comment for ${comment.path}:${comment.line}`,
          error
        );
        // Log the full comment data for debugging
        console.log("Comment data:", JSON.stringify(comment, null, 2));
        continue;
      }
    }
  } catch (error) {
    console.error("Error in createReviewComment:", error);
  }
}

function sanitizeText(text: string): string {
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu,
      ""
    )
    .trim();
}

async function main() {
  try {
    const prDetails = await getPRDetails();

    await sendTelegramNotification(
      `🔍 Starting code review for PR #${prDetails.pull_number}\n` +
        `Repository: ${prDetails.owner}/${prDetails.repo}\n` +
        `Title: ${prDetails.title}`
    );

    let diff: string | null;
    const eventData = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8")
    );

    if (eventData.action === "opened") {
      diff = await getDiff(
        prDetails.owner,
        prDetails.repo,
        prDetails.pull_number
      );
    } else if (eventData.action === "synchronize") {
      const newBaseSha = eventData.before;
      const newHeadSha = eventData.after;
      const response = await octokit.repos.compareCommits({
        headers: {
          accept: "application/vnd.github.v3.diff",
        },
        owner: prDetails.owner,
        repo: prDetails.repo,
        base: newBaseSha,
        head: newHeadSha,
      });
      diff = String(response.data);
    } else {
      await sendTelegramNotification(
        `i️ Skipping unsupported event: ${process.env.GITHUB_EVENT_NAME}`
      );
      return;
    }

    if (!diff) {
      await sendTelegramNotification(`i️ No changes to review`);
      return;
    }

    const parsedDiff = parseDiff(diff);
    const excludePatterns = core
      .getInput("exclude")
      .split(",")
      .map((s) => s.trim());

    const filteredDiff = parsedDiff.filter((file) => {
      return !excludePatterns.some((pattern) =>
        minimatch(file.to ?? "", pattern)
      );
    });

    if (filteredDiff.length === 0) {
      await sendTelegramNotification(`i️ No files to review after filtering`);
      return;
    }

    const comments = await analyzeCode(filteredDiff, prDetails);

    if (comments.length > 0) {
      await createReviewComment(
        prDetails.owner,
        prDetails.repo,
        prDetails.pull_number,
        comments
      );

      const commentSummary = comments
        .map(
          (comment) =>
            `🔹 File: ${comment.path}\n` +
            `Line: ${comment.line}\n` +
            `Comment: ${comment.body.replace("Code Review Bot:\n\n", "")}`
        )
        .join("\n\n");

      await sendTelegramNotification(
        `✅ Review completed with ${comments.length} suggestions:\n\n${commentSummary}`
      );
    } else {
      await sendTelegramNotification(`✅ Review completed. No issues found.`);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("Error during review:", errorMessage);
    await sendTelegramNotification(
      `⚠️ Review completed with some issues: ${errorMessage}`
    );
  }
}

main().catch(async (error) => {
  console.log("Error:", error);
  try {
    await sendTelegramNotification(
      `⚠️ Review process encountered an error but completed`
    );
  } catch {
    // Ignore any errors from sending Telegram notification
  }
});
