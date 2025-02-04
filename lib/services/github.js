"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const fs_1 = require("fs");
const rest_1 = require("@octokit/rest");
const config_1 = require("../config");
class GitHubService {
  constructor() {
    this.octokit = new rest_1.Octokit({ auth: config_1.config.github.token });
  }
  getPRDetails() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      const { repository, number } = JSON.parse(
        (0, fs_1.readFileSync)(process.env.GITHUB_EVENT_PATH || "", "utf8")
      );
      const prResponse = yield this.octokit.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: number,
      });
      return {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: number,
        title: (_a = prResponse.data.title) !== null && _a !== void 0 ? _a : "",
        description:
          (_b = prResponse.data.body) !== null && _b !== void 0 ? _b : "",
      };
    });
  }
  getPRLatestCommit(owner, repo, pull_number) {
    return __awaiter(this, void 0, void 0, function* () {
      const { data: pr } = yield this.octokit.pulls.get({
        owner,
        repo,
        pull_number,
      });
      return pr.head.sha;
    });
  }
  getDiff(owner, repo, pull_number) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const response = yield this.octokit.pulls.get({
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
    });
  }
  getCommitsDiff(owner, repo, baseSha, headSha) {
    return __awaiter(this, void 0, void 0, function* () {
      const response = yield this.octokit.repos.compareCommits({
        headers: {
          accept: "application/vnd.github.v3.diff",
        },
        owner,
        repo,
        base: baseSha,
        head: headSha,
      });
      return String(response.data);
    });
  }
  createReviewComments(owner, repo, pull_number, comments) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        for (const comment of comments) {
          try {
            console.log("Creating comment:", {
              path: comment.path,
              line: comment.line,
              diff_hunk: comment.diff_hunk,
            });
            yield this.octokit.pulls.createReviewComment({
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
            yield new Promise((resolve) => setTimeout(resolve, 1000));
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
    });
  }
}
exports.GitHubService = GitHubService;
