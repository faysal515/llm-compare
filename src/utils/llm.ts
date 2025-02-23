import { generateText, streamText } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
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

      case "openai":
        client = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
        });
        break;

      case "groq":
        client = createGroq({
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
  duration?: {
    total: number;
    firstToken: number | null;
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
      .filter(([, isSelected]) => isSelected)
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

// Add this helper function
function getSecondsSince(startTime: number): number {
  return (Date.now() - startTime) / 1000;
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

    case "openai":
      client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      break;

    case "groq":
      client = createGroq({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      break;

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }

  const streamStart = Date.now();
  let firstTokenTime: number | null = null;

  const { textStream } = await streamText({
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
    // eslint-disable-next-line
    onError: (error: any) => {
      console.log("Error CB:", error);
      const errorMessage =
        error?.error?.data?.error?.message ||
        error.message ||
        "An error occurred during streaming";
      onToken({
        configId: config.id,
        modelId,
        content: "",
        error: errorMessage,
      });
    },
    onFinish: ({ finishReason, usage }) => {
      console.log("Finish reason:", finishReason);

      const totalDuration = getSecondsSince(streamStart);
      const timeToFirstToken = firstTokenTime
        ? (firstTokenTime - streamStart) / 1000
        : null;

      // data: {"id":"chatcmpl-fb9dd2dd-8139-4d7b-8dd6-cd8c6f5de724","object":"chat.completion.chunk","created":1739895917,"model":"llama-3.3-70b-versatile","system_fingerprint":"fp_0a4b7a8df3","choices":[{"index":0,"delta":{},"logprobs":null,"finish_reason":"stop"}],"x_groq":{"id":"req_01jmcy1hwvfcxb6jj6fmxs95sz","usage":{"queue_time":0.902374807,"prompt_tokens":46,"prompt_time":0.005498424,"completion_tokens":84,"completion_time":0.305454545,"total_tokens":130,"total_time":0.310952969}}}

      console.log("Token usage:", { usage, totalDuration, timeToFirstToken });
      onToken({
        configId: config.id,
        modelId,
        content: "",
        usage: usage,
        duration: {
          total: totalDuration,
          firstToken: timeToFirstToken,
        },
      });
    },
  });

  try {
    for await (const chunk of textStream) {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
      }
      onToken({
        configId: config.id,
        modelId,
        content: chunk,
      });
    }
    // eslint-disable-next-line
  } catch (error: any) {
    console.log("Error CATCH:", error);
    const errorMessage =
      error.data?.error?.message ||
      error.message ||
      "An error occurred during streaming";
    onToken({
      configId: config.id,
      modelId,
      content: "",
      error: errorMessage,
    });
  }
}
