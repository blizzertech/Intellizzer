import OpenAI from "openai";
import { config } from "../config";
import { AIReviewResponse } from "../types";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.apiEndpoint || undefined,
    });
  }

  async getReview(prompt: string): Promise<Array<AIReviewResponse> | null> {
    const queryConfig = {
      model: config.openai.model,
      ...config.openai.queryConfig,
      // return JSON if the model supports it:
      ...(config.openai.model === "gpt-4o-mini"
        ? { response_format: { type: "json_object" as const } }
        : {}),
      messages: [
        {
          role: "system" as const,
          content: prompt,
        },
      ],
    };

    try {
      const response = await this.openai.chat.completions.create(queryConfig);
      const res = response.choices[0].message?.content?.trim() || "{}";
      return JSON.parse(res).reviews;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
}
