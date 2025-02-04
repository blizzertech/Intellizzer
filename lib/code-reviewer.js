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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeReviewer = void 0;
const fs_1 = require("fs");
const parse_diff_1 = __importDefault(require("parse-diff"));
const minimatch_1 = __importDefault(require("minimatch"));
const github_1 = require("./services/github");
const openai_1 = require("./services/openai");
const telegram_1 = require("./services/telegram");
const config_1 = require("./config");
const code_review_1 = require("./utils/code-review");
class CodeReviewer {
  constructor() {
    this.github = new github_1.GitHubService();
    this.openai = new openai_1.OpenAIService();
    this.telegram = new telegram_1.TelegramService();
  }
  reviewPullRequest() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const prDetails = yield this.github.getPRDetails();
        yield this.telegram.sendNotification(
          `🔍 Starting code review for PR #${prDetails.pull_number}\n` +
            `Repository: ${prDetails.owner}/${prDetails.repo}\n` +
            `Title: ${prDetails.title}`
        );
        const diff = yield this.getDiffForEvent(prDetails);
        if (!diff) {
          yield this.telegram.sendNotification(`i️ No changes to review`);
          return;
        }
        const parsedDiff = (0, parse_diff_1.default)(diff);
        const filteredDiff = this.filterExcludedFiles(parsedDiff);
        if (filteredDiff.length === 0) {
          yield this.telegram.sendNotification(
            `i️ No files to review after filtering`
          );
          return;
        }
        const comments = yield this.analyzeCode(filteredDiff, prDetails);
        if (comments.length > 0) {
          yield this.github.createReviewComments(
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
                `Comment: ${comment.body.replace(
                  `${config_1.config.bot.name}:\n\n`,
                  ""
                )}`
            )
            .join("\n\n");
          yield this.telegram.sendNotification(
            `✅ Review completed with ${comments.length} suggestions:\n\n${commentSummary}`
          );
        } else {
          yield this.telegram.sendNotification(
            `✅ Review completed. No issues found.`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.log("Error during review:", errorMessage);
        yield this.telegram.sendNotification(
          `⚠️ Review completed with some issues: ${errorMessage}`
        );
      }
    });
  }
  getDiffForEvent(prDetails) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const eventData = JSON.parse(
        (0, fs_1.readFileSync)(
          (_a = process.env.GITHUB_EVENT_PATH) !== null && _a !== void 0
            ? _a
            : "",
          "utf8"
        )
      );
      if (eventData.action === "opened") {
        return yield this.github.getDiff(
          prDetails.owner,
          prDetails.repo,
          prDetails.pull_number
        );
      } else if (eventData.action === "synchronize") {
        return yield this.github.getCommitsDiff(
          prDetails.owner,
          prDetails.repo,
          eventData.before,
          eventData.after
        );
      } else {
        yield this.telegram.sendNotification(
          `i️ Skipping unsupported event: ${process.env.GITHUB_EVENT_NAME}`
        );
        return null;
      }
    });
  }
  filterExcludedFiles(parsedDiff) {
    return parsedDiff.filter((file) => {
      return !config_1.config.excludePatterns.some((pattern) => {
        var _a;
        return (0, minimatch_1.default)(
          (_a = file.to) !== null && _a !== void 0 ? _a : "",
          pattern
        );
      });
    });
  }
  analyzeCode(parsedDiff, prDetails) {
    return __awaiter(this, void 0, void 0, function* () {
      const comments = [];
      const commitId = yield this.github.getPRLatestCommit(
        prDetails.owner,
        prDetails.repo,
        prDetails.pull_number
      );
      for (const file of parsedDiff) {
        if (!file.to || file.to === "/dev/null") continue;
        for (const chunk of file.chunks) {
          const prompt = (0, code_review_1.createPrompt)(
            file,
            chunk,
            prDetails
          );
          const aiResponse = yield this.openai.getReview(prompt);
          if (aiResponse) {
            for (const review of aiResponse) {
              const lineNumber = Number(review.lineNumber);
              const comment = (0, code_review_1.createReviewComment)(
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
    });
  }
}
exports.CodeReviewer = CodeReviewer;
