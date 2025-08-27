import type { BinderLayout, BinderTemplate } from "../types/Binder";

export class DataService {
  private static baseUrl = import.meta.env.DEV
    ? "/public/data"
    : "/pokemon-card-binder/data";

  // Load all available binders from localStorage and GitHub
  static async loadAvailableBinders(): Promise<string[]> {
    const localBinders = this.getLocalBinderIds();

    try {
      const response = await fetch(`${this.baseUrl}/index.json`);
      const data = await response.json();
      const githubBinders = data.binders || [];

      // Combine and deduplicate
      return [...new Set([...localBinders, ...githubBinders])];
    } catch (error) {
      console.log("No GitHub binder index found, using local only");
      return localBinders;
    }
  }

  // Load specific binder (try GitHub first, then localStorage)
  static async loadBinder(binderId: string): Promise<BinderLayout | null> {
    // Try GitHub first
    try {
      const response = await fetch(`${this.baseUrl}/binders/${binderId}.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log(
        `Failed to load ${binderId} from GitHub, trying localStorage`
      );
    }

    // Fallback to localStorage
    const cached = localStorage.getItem(`binder-${binderId}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Save binder to localStorage
  static saveBinder(binder: BinderLayout): void {
    const updated = {
      ...binder,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`binder-${binder.id}`, JSON.stringify(updated));
    this.updateLocalIndex(binder.id);
  }

  // Export binder as JSON file for manual GitHub upload
  static exportBinderForGitHub(binder: BinderLayout): void {
    const exportData = JSON.stringify(binder, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${binder.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Load binder templates
  static async loadTemplates(): Promise<BinderTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/index.json`);
      const data = await response.json();
      return data.templates || this.getDefaultTemplates();
    } catch (error) {
      return this.getDefaultTemplates();
    }
  }

  private static getLocalBinderIds(): string[] {
    const stored = localStorage.getItem("binder-index");
    return stored ? JSON.parse(stored) : [];
  }

  private static updateLocalIndex(binderId: string): void {
    const existing = this.getLocalBinderIds();
    if (!existing.includes(binderId)) {
      existing.push(binderId);
      localStorage.setItem("binder-index", JSON.stringify(existing));
    }
  }

  private static getDefaultTemplates(): BinderTemplate[] {
    return [
      {
        id: "9-pocket",
        name: "9-Pocket Standard",
        dimensions: { rows: 3, cols: 3 },
        description: "Standard 9-pocket binder page",
        isDefault: true,
      },
      {
        id: "ultra-pro-18",
        name: "Ultra Pro 18-Pocket",
        dimensions: { rows: 2, cols: 9 },
        description: "Ultra Pro side-loading 18-pocket page",
        isDefault: true,
      },
      {
        id: "custom-4x4",
        name: "Custom 4x4",
        dimensions: { rows: 4, cols: 4 },
        description: "Custom 16-card layout",
        isDefault: false,
      },
    ];
  }

  // Create new binder from template
  static createBinderFromTemplate(
    templateId: string,
    templates: BinderTemplate[]
  ): BinderLayout {
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const totalSlots = template.dimensions.rows * template.dimensions.cols;

    return {
      id: `binder-${Date.now()}`,
      name: `New ${template.name}`,
      description: `Created from ${template.name} template`,
      dimensions: template.dimensions,
      cardPositions: Array.from({ length: totalSlots }, (_, index) => ({
        cardId: null,
        row: Math.floor(index / template.dimensions.cols),
        col: index % template.dimensions.cols,
        isEmpty: true,
      })),
      template: templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
