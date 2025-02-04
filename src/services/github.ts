import { readFileSync } from "fs";
import { Octokit } from "@octokit/rest";
import { config } from "../config";
import { PRDetails, ReviewComment } from "../types";

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({ auth: config.github.token });
  }

  async getPRDetails(): Promise<PRDetails> {
    const { repository, number } = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf8")
    );
    const prResponse = await this.octokit.pulls.get({
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

  async getPRLatestCommit(
    owner: string,
    repo: string,
    pull_number: number
  ): Promise<string> {
    const { data: pr } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number,
    });
    return pr.head.sha;
  }

  async getDiff(
    owner: string,
    repo: string,
    pull_number: number
  ): Promise<string | null> {
    try {
      const response = await this.octokit.pulls.get({
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

  async getCommitsDiff(
    owner: string,
    repo: string,
    baseSha: string,
    headSha: string
  ): Promise<string> {
    const response = await this.octokit.repos.compareCommits({
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
      owner,
      repo,
      base: baseSha,
      head: headSha,
    });
    return String(response.data);
  }

  async createReviewComments(
    owner: string,
    repo: string,
    pull_number: number,
    comments: Array<ReviewComment>
  ): Promise<void> {
    try {
      for (const comment of comments) {
        try {
          console.log("Creating comment:", {
            path: comment.path,
            line: comment.line,
            diff_hunk: comment.diff_hunk,
          });

          await this.octokit.pulls.createReviewComment({
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
          console.log("Comment data:", JSON.stringify(comment, null, 2));
          continue;
        }
      }
    } catch (error) {
      console.error("Error in createReviewComment:", error);
    }
  }
}
