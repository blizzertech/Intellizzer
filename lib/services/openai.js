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
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
class OpenAIService {
  constructor() {
    this.openai = new openai_1.default({
      apiKey: config_1.config.openai.apiKey,
      baseURL: config_1.config.openai.apiEndpoint || undefined,
    });
  }
  getReview(prompt) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      const queryConfig = Object.assign(
        Object.assign(
          Object.assign(
            { model: config_1.config.openai.model },
            config_1.config.openai.queryConfig
          ),
          config_1.config.openai.model === "gpt-4o-mini"
            ? { response_format: { type: "json_object" } }
            : {}
        ),
        {
          messages: [
            {
              role: "system",
              content: prompt,
            },
          ],
        }
      );
      try {
        const response = yield this.openai.chat.completions.create(queryConfig);
        const res =
          ((_b =
            (_a = response.choices[0].message) === null || _a === void 0
              ? void 0
              : _a.content) === null || _b === void 0
            ? void 0
            : _b.trim()) || "{}";
        return JSON.parse(res).reviews;
      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    });
  }
}
exports.OpenAIService = OpenAIService;
