// TypeScript declarations for EdNotes RichText Editor

export interface EditorInstance {
  originalTextarea: HTMLTextAreaElement;
  editor: HTMLElement;
  getHTML(): string;
  setHTML(html: string): void;
  getPlain(): string;
  getMarkdown(): string;
  focus(): void;
  destroy?(): void;
}

export interface AutosaveConfig {
  interval: number;
  handler: (html: string) => void;
}

export interface HistoryConfig {
  limit: number;
}

export interface PasteConfig {
  clean: boolean;
}

export interface A11yConfig {
  announcements: boolean;
}

export interface InitConfig {
  selector: string;
  plugins?: string;
  toolbar?: string;
  autosave?: AutosaveConfig;
  history?: HistoryConfig;
  paste?: PasteConfig;
  a11y?: A11yConfig;
  theme?: 'default' | 'high-contrast' | 'professional' | 'dyslexia' | string;
  onChange?: (html: string) => void;
  onReady?: (editor: EditorInstance) => void;
  onDestroy?: (editor: EditorInstance) => void;
  promptLink?: () => string | null;
}

export interface PluginButton {
  name: string;
  icon: string;
  label: string;
  command: string;
  shortcut?: string;
  dropdown?: boolean;
}

export interface PluginDefinition {
  name: string;
  required?: boolean;
  buttons?: PluginButton[];
  init?: (editor: EditorInstance) => void;
  dispose?: (editor: EditorInstance) => void;
}

export interface EdNotesRichTextAPI {
  readonly version: string;
  
  // Primary API
  init(config?: InitConfig): EditorInstance[];
  
  // Plugin management
  registerPlugin(name: string, definition: PluginDefinition): void;
  
  // Theme management  
  applyTheme(themeName: string): void;
  
  // Instance management
  get(selector: string | HTMLElement): EditorInstance | undefined;
  destroy(selector: string | HTMLElement): void;
  
  // Global operations
  undo(): void;
  redo(): void;
  triggerSave(): void;
  
  // Export helpers
  exportAllPlain(): string[];
  exportAllMarkdown(): string[];
  exportAllHTML(): string[];
  
  // Internal (testing)
  _plugins(): any;
  _instances(): EditorInstance[];
}

// Legacy API (backward compatibility)
export interface RichTextLegacyAPI {
  attach(selector: string, options?: {
    historyLimit?: number;
    onChange?: (html: string) => void;
    autosaveIntervalMs?: number;
    onAutosave?: (html: string) => void;
    promptLink?: () => string | null;
  }): EditorInstance[];
  
  undo(): void;
  redo(): void;
  triggerSave(): void;
  exportAllPlain(): string[];
  exportAllMarkdown(): string[];
  exportAllHTML(): string[];
  _all(): EditorInstance[];
}

// Global declarations
declare global {
  interface Window {
    EdNotesRichText: EdNotesRichTextAPI;
    RichText: RichTextLegacyAPI;
  }
}

// Main export
declare const EdNotesRichText: EdNotesRichTextAPI;
export default EdNotesRichText;
export { EdNotesRichText };
