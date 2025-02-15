import { generateText, streamText, TokenUsage } from "ai";
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

export type StreamResponse = {
  configId: string;
  modelId: string;
  content: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export async function streamToModels(
  configs: LLMConfig[],
  selectedModels: { [configId: string]: { [modelId: string]: boolean } },
  systemPrompt: string,
  userPrompt: string,
  onToken: (response: StreamResponse) => void
) {
  // Get all selected model configurations
  const modelCalls = configs.flatMap((config) => {
    return Object.entries(selectedModels[config.id] || {})
      .filter(([_, isSelected]) => isSelected)
      .map(([modelId]) => {
        return streamToModel(
          config,
          modelId,
          systemPrompt,
          userPrompt,
          onToken
        ).catch((error) => {
          // If individual model fails, send error through callback
          onToken({
            configId: config.id,
            modelId,
            content: "",
            error: error.message,
          });
        });
      });
  });

  // Run all model calls in parallel
  await Promise.all(modelCalls);
}

async function streamToModel(
  config: LLMConfig,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  onToken: (response: StreamResponse) => void
) {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error("Missing required configuration");
  }

  const model = config.models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model with ID ${modelId} not found`);
  }

  let client;
  switch (config.provider) {
    case "azure-openai":
      client = createAzure({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
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

  const { textStream, usage } = await streamText({
    model: client(model.name),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    onFinish: ({ finishReason, usage }) => {
      console.log("Finish reason:", finishReason);
      console.log("Token usage:", usage);
      // Send final update with usage information
      onToken({
        configId: config.id,
        modelId,
        content: "",
        usage: usage,
      });
    },
  });

  for await (const chunk of textStream) {
    onToken({
      configId: config.id,
      modelId,
      content: chunk,
    });
  }
}
