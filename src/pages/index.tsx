import { useEffect, useState } from "react";
import { Check, Plus, ChevronLeft, ChevronRight, Send } from "lucide-react";
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
          {/* Chat messages will go here */}
        </div>

        <div className="border-t p-4 bg-background">
          <div className="w-[80%] mx-auto flex gap-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  // Handle send
                }
              }}
            />
            <Button
              onClick={() => {
                // Handle send
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "h-full border-l bg-background transition-all duration-300",
          isCollapsed ? "w-[50px]" : "w-[350px]"
        )}
      >
        <div className="relative h-full">
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
              "h-full overflow-auto p-6",
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
        </div>
      </div>
    </div>
  );
}
