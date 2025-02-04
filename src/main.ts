import { CodeReviewer } from "./code-reviewer";

async function main() {
  const reviewer = new CodeReviewer();

  try {
    await reviewer.reviewPullRequest();
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
