import { generateText } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { LLMConfig } from "@/hooks/use-llm-store";

export async function testModel(
  config: LLMConfig,
  modelName: string
): Promise<boolean> {
  try {
    if (!config.baseUrl || !config.apiKey || !modelName) {
      throw new Error("Missing required configuration");
    }

    let client;
    switch (config.provider) {
      case "azure-openai":
        client = createAzure({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
          // defaultQuery: { "api-version": "2024-02-15-preview" },
          // defaultHeaders: { "api-key": config.apiKey },
        });
        break;

      case "deepseek":
        client = createDeepSeek({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    const response = await generateText({
      model: client(modelName),
      prompt: "hello",
    });

    return !!response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        throw new Error(
          "Could not connect to the API. Please check your Base URL and API Key."
        );
      }
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}
