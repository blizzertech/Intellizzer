import axios from "axios";
import { config } from "../config";

export class TelegramService {
  private readonly apiUrl: string;
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = config.telegram.enableBot;
    this.apiUrl = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  }

  async sendNotification(message: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await axios.post(this.apiUrl, {
        chat_id: config.telegram.chatId,
        text: message,
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
    }
  }
}
