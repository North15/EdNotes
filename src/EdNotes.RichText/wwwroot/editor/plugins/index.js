// Plugin registry for EdNotes RichText Editor
// Provides TinyMCE-style plugin system with declarative toolbar configuration

const plugins = new Map();
const toolbarButtons = new Map();

// Core plugin registry
export function registerPlugin(name, definition) {
    if (plugins.has(name)) {
        console.warn(`[EdNotes.RichText] Plugin '${name}' already registered, skipping`);
        return;
    }
    
    plugins.set(name, definition);
    
    // Register toolbar buttons from this plugin
    if (definition.buttons) {
        definition.buttons.forEach(button => {
            toolbarButtons.set(button.name, {
                ...button,
                plugin: name
            });
        });
    }
}

export function getPlugin(name) {
    return plugins.get(name);
}

export function parseToolbar(toolbarString) {
    if (!toolbarString) return [];
    
    return toolbarString.split('|').map(group => 
        group.trim().split(/\s+/).filter(name => name.length > 0)
    );
}

export function getToolbarButton(name) {
    return toolbarButtons.get(name);
}

export function validatePlugins(pluginList) {
    const invalid = [];
    pluginList.forEach(name => {
        if (!plugins.has(name)) {
            invalid.push(name);
        }
    });
    return invalid;
}

// Core plugins (always available)
registerPlugin('core', {
    name: 'core',
    required: true,
    buttons: [
        { name: 'undo', icon: 'undo', label: 'Undo', command: 'undo' },
        { name: 'redo', icon: 'redo', label: 'Redo', command: 'redo' }
    ],
    init(editor) {
        // Core functionality always enabled
    }
});

registerPlugin('formatting', {
    name: 'formatting',
    buttons: [
        { name: 'bold', icon: 'bold', label: 'Bold', command: 'bold', shortcut: 'Ctrl+B' },
        { name: 'italic', icon: 'italic', label: 'Italic', command: 'italic', shortcut: 'Ctrl+I' },
        { name: 'underline', icon: 'underline', label: 'Underline', command: 'underline', shortcut: 'Ctrl+U' },
        { name: 'removeformat', icon: 'clear', label: 'Remove Format', command: 'removeFormat' }
    ]
});

registerPlugin('blocks', {
    name: 'blocks',
    buttons: [
        { name: 'blocks', icon: 'heading', label: 'Blocks', command: 'heading', dropdown: true }
    ]
});

registerPlugin('lists', {
    name: 'lists',
    buttons: [
        { name: 'numlist', icon: 'list-ol', label: 'Numbered List', command: 'insertOrderedList' },
        { name: 'bullist', icon: 'list-ul', label: 'Bullet List', command: 'insertUnorderedList' }
    ]
});

registerPlugin('links', {
    name: 'links',
    buttons: [
        { name: 'link', icon: 'link', label: 'Insert Link', command: 'createLink' },
        { name: 'unlink', icon: 'unlink', label: 'Remove Link', command: 'unlink' }
    ]
});

registerPlugin('tables', {
    name: 'tables',
    buttons: [
        { name: 'table', icon: 'table', label: 'Insert Table', command: 'insertTable' }
    ]
});

registerPlugin('tasks', {
    name: 'tasks', 
    buttons: [
        { name: 'task', icon: 'check-square', label: 'Task List', command: 'insertTaskList' }
    ]
});

registerPlugin('math', {
    name: 'math',
    buttons: [
        { name: 'math', icon: 'formula', label: 'Math Equation', command: 'insertMath' }
    ]
});
