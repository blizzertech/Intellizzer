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
exports.TelegramService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
class TelegramService {
  constructor() {
    this.isEnabled = config_1.config.telegram.enableBot;
    this.apiUrl = `https://api.telegram.org/bot${config_1.config.telegram.botToken}/sendMessage`;
  }
  sendNotification(message) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.isEnabled) {
        return;
      }
      try {
        yield axios_1.default.post(this.apiUrl, {
          chat_id: config_1.config.telegram.chatId,
          text: message,
          parse_mode: "HTML",
        });
      } catch (error) {
        console.error("Error sending Telegram notification:", error);
      }
    });
  }
}
exports.TelegramService = TelegramService;
