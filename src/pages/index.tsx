import { useEffect, useState } from "react";
import {
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Send,
  Expand,
  Minimize2,
} from "lucide-react";
import { useLLMStore, LLMConfig } from "@/hooks/use-llm-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { StreamResponse, streamToModels } from "@/utils/llm";

interface ModelSelection {
  [configId: string]: {
    [modelId: string]: boolean;
  };
}

export default function Home() {
  const { configs } = useLLMStore();
  const [selectedModels, setSelectedModels] = useState<ModelSelection>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const defaultAccordionValues = configs.map((config) => config.id);
  const [input, setInput] = useState("");
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    "You're a helpful assistant."
  );
  const [responses, setResponses] = useState<{
    [key: string]: {
      content: string;
      error?: string;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    };
  }>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [calculationMultiplier, setCalculationMultiplier] = useState<number>(1);
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  console.log("Configs:", configs);

  useEffect(() => {
    const initialSelection: ModelSelection = {};
    configs.forEach((config) => {
      initialSelection[config.id] = {};
      config.models.forEach((model) => {
        initialSelection[config.id][model.id] = true;
      });
    });
    console.log("Initial Selection:", initialSelection);
    setSelectedModels(initialSelection);
  }, [configs]);

  const isAllModelsSelected = (config: LLMConfig) => {
    return config.models.every(
      (model) => selectedModels[config.id]?.[model.id]
    );
  };

  const toggleAllModels = (config: LLMConfig, checked: boolean) => {
    setSelectedModels((prev) => ({
      ...prev,
      [config.id]: Object.fromEntries(
        config.models.map((model) => [model.id, checked])
      ),
    }));
  };

  const toggleModel = (configId: string, modelId: string, checked: boolean) => {
    setSelectedModels((prev) => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [modelId]: checked,
      },
    }));
  };

  console.log("Selected Models:", selectedModels);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    setIsStreaming(true);
    setResponses({});

    try {
      await streamToModels(
        configs,
        selectedModels,
        systemPrompt,
        input,
        (response: StreamResponse) => {
          setResponses((prev) => {
            const key = `${response.configId}|${response.modelId}`;
            const existing = prev[key]?.content || "";
            const existingUsage = prev[key]?.usage;

            return {
              ...prev,
              [key]: {
                content: response.error
                  ? response.error
                  : existing + response.content,
                error: response.error,
                usage: response.usage || existingUsage,
              },
            };
          });
        }
      );
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
      setInput("");
    }
  };

  if (configs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Playground</h1>
        <div className="text-center py-12">
          <h2 className="text-lg text-muted-foreground mb-4">
            No LLM providers configured
          </h2>
          <Link href="/settings">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-65px)]">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-6">
          <h1 className="text-2xl font-bold mb-6">Playground</h1>

          {/* Display responses */}
          <div className="space-y-4">
            {Object.entries(responses).map(([key, response]) => {
              const [configId, modelId] = key.split("|");
              const config = configs.find((c) => c.id === configId);
              const model = config?.models.find((m) => m.id === modelId);

              // Calculate costs if usage exists
              const cost =
                response.usage && model
                  ? (
                      response.usage.promptTokens *
                        (model.inputTokenPrice / 1_000_000) +
                      response.usage.completionTokens *
                        (model.outputTokenPrice / 1_000_000)
                    ).toFixed(6)
                  : null;

              return (
                <div
                  key={key}
                  className={cn(
                    "p-4 rounded-lg border",
                    response.error && "border-destructive"
                  )}
                >
                  <div className="text-xs mb-2 text-blue-500">
                    {config?.provider} - {model?.name}
                  </div>
                  <div className="whitespace-pre-wrap">{response.content}</div>
                  {response.usage && (
                    <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                      Tokens: {response.usage.promptTokens} prompt +{" "}
                      {response.usage.completionTokens} completion ={" "}
                      {response.usage.totalTokens} total
                      {cost && (
                        <>
                          <span className="ml-2 text-green-500 font-bold">
                            (Cost: ${cost})
                          </span>
                          {calculationMultiplier > 1 && (
                            <span className="ml-2 text-green-500 font-bold">
                              ($
                              {(Number(cost) * calculationMultiplier).toFixed(
                                6
                              )}{" "}
                              for {calculationMultiplier} calls)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-4 bg-background">
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Message</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsInputExpanded(!isInputExpanded)}
              >
                {isInputExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Expand className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="w-full flex gap-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className={cn(
                  "flex-1 resize-none",
                  isInputExpanded ? "h-[200px]" : "h-[80px]"
                )}
                disabled={isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} disabled={isStreaming}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Press {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter
              to send
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "h-full border-l bg-background transition-all duration-300",
          isCollapsed ? "w-[50px]" : "w-[350px]"
        )}
      >
        <div className="relative h-full flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-4 top-3 z-10 h-8 w-8 rounded-full border shadow-md"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div
            className={cn(
              "border-t p-4",
              isCollapsed && "invisible",
              isPromptExpanded ? "h-[50vh]" : "h-[200px]"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold mb-4">System Prompt</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
              >
                {isPromptExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Expand className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system prompt..."
              className={cn(
                "resize-none h-full",
                isPromptExpanded ? "h-[calc(50vh-60px)]" : "h-[140px]"
              )}
            />
          </div>
          <div
            className={cn(
              "flex-1 overflow-auto p-6",
              isCollapsed && "invisible"
            )}
          >
            <h2 className="text-lg font-semibold mb-4">Available Models</h2>
            <div className="border rounded-lg">
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={defaultAccordionValues}
              >
                {configs.map((config) => (
                  <AccordionItem
                    key={config.id}
                    value={config.id}
                    className="px-4"
                  >
                    <div className="flex items-center gap-4 py-4">
                      <Checkbox
                        checked={isAllModelsSelected(config)}
                        onCheckedChange={(checked) =>
                          toggleAllModels(config, checked as boolean)
                        }
                      />
                      <AccordionTrigger className="hover:no-underline flex-1">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{config.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({config.models.length} models)
                          </span>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent>
                      <div className="pl-10 space-y-3 py-2">
                        {config.models.map((model) => (
                          <div
                            key={model.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              checked={selectedModels[config.id]?.[model.id]}
                              onCheckedChange={(checked) =>
                                toggleModel(
                                  config.id,
                                  model.id,
                                  checked as boolean
                                )
                              }
                            />
                            <span className="text-sm">{model.name}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
          <div className={cn("border-t p-4", isCollapsed && "invisible")}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Calculate</h3>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="999999"
                value={calculationMultiplier}
                onChange={(e) =>
                  setCalculationMultiplier(Number(e.target.value))
                }
                className="w-32"
                placeholder="API calls"
              />
              <span className="text-sm text-muted-foreground">API calls</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
