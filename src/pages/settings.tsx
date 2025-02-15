import { useState } from "react";
import { Plus, Trash2, X, Check, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useLLMStore,
  LLM_PROVIDERS,
  LLMProvider,
  LLMModel,
  LLMConfig,
} from "@/hooks/use-llm-store";
import { Badge } from "@/components/ui/badge";
import { testModel } from "@/utils/llm";

export default function Settings() {
  const { configs, addConfig, deleteConfig, updateConfig } = useLLMStore();
  const [open, setOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: "" as LLMProvider,
    name: "",
    baseUrl: "",
    apiKey: "",
    models: [] as LLMModel[],
  });
  const [modelName, setModelName] = useState("");
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [editFormData, setEditFormData] = useState({
    baseUrl: "",
    apiKey: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConfig(formData);
    setOpen(false);
    setFormData({
      provider: "" as LLMProvider,
      name: "",
      baseUrl: "",
      apiKey: "",
      models: [],
    });
  };

  const handleAddModel = (configId: string) => {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;

    const newModel: LLMModel = {
      id: crypto.randomUUID(),
      name: modelName,
    };

    updateConfig(configId, {
      ...config,
      models: [...config.models, newModel],
    });

    setModelName("");
    setModelDialogOpen(null);
  };

  const handleTestModel = async () => {
    if (!modelDialogOpen) return;

    const config = configs.find((c) => c.id === modelDialogOpen);
    if (!config) return;

    setIsTestingModel(true);
    setTestResult(null);

    try {
      const success = await testModel(config, modelName);
      setTestResult({
        success,
        message: success ? "Model working" : "Model test failed",
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      });
    } finally {
      setIsTestingModel(false);
    }
  };

  const handleCloseModelDialog = () => {
    setModelDialogOpen(null);
    setModelName("");
    setTestResult(null);
    setIsTestingModel(false);
  };

  const handleDeleteModel = (configId: string, modelId: string) => {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;

    updateConfig(configId, {
      ...config,
      models: config.models.filter((m) => m.id !== modelId),
    });
  };

  const handleEditClick = (config: LLMConfig) => {
    setEditingConfig(config);
    setEditFormData({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    updateConfig(editingConfig.id, {
      ...editingConfig,
      baseUrl: editFormData.baseUrl,
      apiKey: editFormData.apiKey,
    });
    setEditingConfig(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="fixed right-6 top-6">
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="bg-[#0F172A] text-white hover:bg-[#1E293B]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Add LLM Provider
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value: LLMProvider) =>
                  setFormData({ ...formData, provider: value })
                }
              >
                <SelectTrigger id="provider" className="w-full">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="My Azure OpenAI"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) =>
                  setFormData({ ...formData, baseUrl: e.target.value })
                }
                placeholder="https://api.example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Add Provider
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <div
              key={config.id}
              className="group relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">{config.name}</h3>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(config)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteConfig(config.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {
                    LLM_PROVIDERS.find((p) => p.value === config.provider)
                      ?.label
                  }
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {config.baseUrl}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {config.models.map((model) => (
                    <Badge
                      key={model.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {model.name}
                      <button
                        onClick={() => handleDeleteModel(config.id, model.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModelDialogOpen(config.id)}
                    className="h-6"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Model
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!modelDialogOpen} onOpenChange={handleCloseModelDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Model</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (modelDialogOpen) handleAddModel(modelDialogOpen);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name</Label>
              <Input
                id="modelName"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="model name/ deployment name if using azure openai"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestModel}
                disabled={isTestingModel}
                className="relative"
              >
                {isTestingModel ? "Testing..." : "Test Model"}
              </Button>
              <Button type="submit" className="flex-1">
                Add Model
              </Button>
            </div>
            {testResult && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testResult.success ? "text-green-500" : "text-red-500"
                }`}
              >
                {testResult.success ? (
                  <>
                    <Check className="h-4 w-4" />
                    {testResult.message}
                  </>
                ) : (
                  testResult.message
                )}
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingConfig}
        onOpenChange={(open) => !open && setEditingConfig(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Provider Configuration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editBaseUrl">Base URL</Label>
              <Input
                id="editBaseUrl"
                value={editFormData.baseUrl}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, baseUrl: e.target.value })
                }
                placeholder="https://api.example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editApiKey">API Key</Label>
              <Input
                id="editApiKey"
                type="password"
                value={editFormData.apiKey}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, apiKey: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
