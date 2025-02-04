import { readFileSync } from "fs";
import parseDiff from "parse-diff";
import minimatch from "minimatch";
import { GitHubService } from "./services/github";
import { OpenAIService } from "./services/openai";
import { TelegramService } from "./services/telegram";
import { config } from "./config";
import { createPrompt, createReviewComment } from "./utils/code-review";
import { PRDetails, ReviewComment } from "./types";

export class CodeReviewer {
  private github: GitHubService;
  private openai: OpenAIService;
  private telegram: TelegramService;

  constructor() {
    this.github = new GitHubService();
    this.openai = new OpenAIService();
    this.telegram = new TelegramService();
  }

  async reviewPullRequest(): Promise<void> {
    try {
      const prDetails = await this.github.getPRDetails();

      await this.telegram.sendNotification(
        `🔍 Starting code review for PR #${prDetails.pull_number}\n` +
          `Repository: ${prDetails.owner}/${prDetails.repo}\n` +
          `Title: ${prDetails.title}`
      );

      const diff = await this.getDiffForEvent(prDetails);

      if (!diff) {
        await this.telegram.sendNotification(`i️ No changes to review`);
        return;
      }

      const parsedDiff = parseDiff(diff);
      const filteredDiff = this.filterExcludedFiles(parsedDiff);

      if (filteredDiff.length === 0) {
        await this.telegram.sendNotification(
          `i️ No files to review after filtering`
        );
        return;
      }

      const comments = await this.analyzeCode(filteredDiff, prDetails);

      if (comments.length > 0) {
        await this.github.createReviewComments(
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
              `Comment: ${comment.body.replace(`${config.bot.name}:\n\n`, "")}`
          )
          .join("\n\n");

        await this.telegram.sendNotification(
          `✅ Review completed with ${comments.length} suggestions:\n\n${commentSummary}`
        );
      } else {
        await this.telegram.sendNotification(
          `✅ Review completed. No issues found.`
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log("Error during review:", errorMessage);
      await this.telegram.sendNotification(
        `⚠️ Review completed with some issues: ${errorMessage}`
      );
    }
  }

  private async getDiffForEvent(prDetails: PRDetails): Promise<string | null> {
    const eventData = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8")
    );

    if (eventData.action === "opened") {
      return await this.github.getDiff(
        prDetails.owner,
        prDetails.repo,
        prDetails.pull_number
      );
    } else if (eventData.action === "synchronize") {
      return await this.github.getCommitsDiff(
        prDetails.owner,
        prDetails.repo,
        eventData.before,
        eventData.after
      );
    } else {
      await this.telegram.sendNotification(
        `i️ Skipping unsupported event: ${process.env.GITHUB_EVENT_NAME}`
      );
      return null;
    }
  }

  private filterExcludedFiles(parsedDiff: parseDiff.File[]): parseDiff.File[] {
    return parsedDiff.filter((file) => {
      return !config.excludePatterns.some((pattern) =>
        minimatch(file.to ?? "", pattern)
      );
    });
  }

  private async analyzeCode(
    parsedDiff: parseDiff.File[],
    prDetails: PRDetails
  ): Promise<Array<ReviewComment>> {
    const comments: Array<ReviewComment> = [];
    const commitId = await this.github.getPRLatestCommit(
      prDetails.owner,
      prDetails.repo,
      prDetails.pull_number
    );

    for (const file of parsedDiff) {
      if (!file.to || file.to === "/dev/null") continue;

      for (const chunk of file.chunks) {
        const prompt = createPrompt(file, chunk, prDetails);
        const aiResponse = await this.openai.getReview(prompt);

        if (aiResponse) {
          for (const review of aiResponse) {
            const lineNumber = Number(review.lineNumber);
            const comment = createReviewComment(
              file,
              chunk,
              commitId,
              lineNumber
            );

            if (comment) {
              comment.body += review.reviewComment;
              comments.push(comment);
            }
          }
        }
      }
    }

    return comments;
  }
}
