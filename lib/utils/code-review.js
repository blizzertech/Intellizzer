"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeText =
  exports.createReviewComment =
  exports.createPrompt =
    void 0;
const config_1 = require("../config");
function createPrompt(file, chunk, prDetails) {
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
exports.createPrompt = createPrompt;
function createReviewComment(file, chunk, commitId, lineNumber) {
  try {
    if (!file.to) {
      return null;
    }
    // Find the change and its context
    const changeIndex = chunk.changes.findIndex(
      (change) =>
        // @ts-expect-error - ln and ln2 exists where needed
        (change.ln || change.ln2) === lineNumber
    );
    if (changeIndex === -1) {
      return null;
    }
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
    return {
      body: `${config_1.config.bot.name}:\n\n`,
      path: file.to,
      line: lineNumber,
      commit_id: commitId,
      diff_hunk: diff_hunk,
    };
  } catch (error) {
    console.error("Error creating review comment:", error);
    return null;
  }
}
exports.createReviewComment = createReviewComment;
function sanitizeText(text) {
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu,
      ""
    )
    .trim();
}
exports.sanitizeText = sanitizeText;
