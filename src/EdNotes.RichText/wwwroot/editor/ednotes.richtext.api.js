// Modern API wrapper for EdNotes RichText Editor
// Provides industry-standard init() interface with plugin system

import { RichText } from './ednotes.richtext.bundle.js';
import { registerPlugin, parseToolbar, validatePlugins } from './plugins/index.js';

// Default configuration
const defaultConfig = {
    selector: 'textarea',
    plugins: 'core formatting blocks lists links tables tasks math',
    toolbar: 'undo redo | blocks | bold italic underline | link | numlist bullist task | table math | removeformat',
    autosave: null,
    history: { limit: 100 },
    paste: { clean: true },
    a11y: { announcements: true },
    theme: 'default'
};

// Global namespace object
const EdNotesRichText = {
    version: '0.5.1',
    
    // Industry-standard initialization
    init(config = {}) {
        const finalConfig = { ...defaultConfig, ...config };
        
        // Validate plugins
        const requestedPlugins = finalConfig.plugins.split(/\s+/).filter(p => p.length > 0);
        const invalidPlugins = validatePlugins(requestedPlugins);
        
        if (invalidPlugins.length > 0) {
            console.warn(`[EdNotes.RichText] Unknown plugins: ${invalidPlugins.join(', ')}`);
        }
        
        // Parse toolbar (for future use with plugin system)
        parseToolbar(finalConfig.toolbar);
        
        // Convert to RichText.attach format
        const attachOptions = {
            historyLimit: finalConfig.history.limit,
            onChange: finalConfig.onChange,
            autosaveIntervalMs: finalConfig.autosave?.interval,
            onAutosave: finalConfig.autosave?.handler,
            promptLink: finalConfig.promptLink
        };
        
        // Initialize with backward compatibility
        RichText.attach(finalConfig.selector, attachOptions);
        
        // Apply theme if specified
        if (finalConfig.theme && finalConfig.theme !== 'default') {
            this.applyTheme(finalConfig.theme);
        }
        
        // Return actual instances array (get all instances that match our selector)
        const allInstances = RichText._all();
        const elements = document.querySelectorAll(finalConfig.selector);
        return Array.from(elements).map(el => 
            allInstances.find(instance => instance.originalTextarea === el)
        ).filter(Boolean);
    },
    
    // Plugin management
    registerPlugin(name, definition) {
        registerPlugin(name, definition);
    },
    
    // Theme management
    applyTheme(themeName) {
        document.querySelectorAll('.rtx-editor').forEach(editor => {
            // Remove existing theme classes
            editor.classList.remove('theme-high-contrast', 'theme-dyslexia', 'theme-professional');
            
            // Apply new theme
            if (themeName !== 'default') {
                editor.classList.add(`theme-${themeName}`);
            }
        });
    },
    
    // Instance management
    get(selector) {
        const instances = RichText._all();
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!element) return undefined;
        return instances.find(instance => instance.originalTextarea === element);
    },
    
    destroy(selector) {
        const instance = this.get(selector);
        if (instance && instance.destroy) {
            instance.destroy();
        }
    },
    
    // Global operations (maintain backward compatibility)
    undo: () => RichText.undo(),
    redo: () => RichText.redo(),
    triggerSave: () => RichText.triggerSave(),
    
    // Export helpers
    exportAllPlain: () => RichText.exportAllPlain(),
    exportAllMarkdown: () => RichText.exportAllMarkdown(), 
    exportAllHTML: () => RichText.exportAllHTML(),
    
    // Internal access for testing
    _plugins: () => registerPlugin,
    _instances: () => RichText._all()
};

// Maintain backward compatibility
window.RichText = RichText;
window.EdNotesRichText = EdNotesRichText;

export { EdNotesRichText };
export default EdNotesRichText;
