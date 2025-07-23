# System Patterns: DRO

## Application Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── Header (minimal, just title)
│   └── MainContent
│       ├── EditorPanel
│       │   ├── CodeEditor (CodeMirror 6 with autocompletion)
│       │   └── ErrorDisplay
│       ├── VisualizerPanel
│       │   ├── SpectrumChart (Canvas-based)
│       │   └── PlaybackControls
│       └── StatusBar
```

### State Management Pattern

- **Local Component State**: UI interactions, editor state
- **Context API**: Shared application state (theme, settings)
- **Custom Hooks**: Lua engine integration, data processing

### Data Model Architecture

#### Core Entities

```typescript
interface SpectralFrame {
  bands: number[]; // 20-band spectral data
  timestamp: number; // Frame index
  metadata?: object; // Optional frame data
}

interface Datum {
  frames: SpectralFrame[];
  sampleRate: number;
  frameCount: number;
  bandCount: number;
}
```

### Lua Integration Pattern

#### Shader-like Execution Model

The Lua runtime operates similar to a fragment shader:

```lua
-- Global variables available in user code
i       -- Current band index (0-19)
f       -- Current frame number
i_amt   -- Total bands (20)
f_amt   -- Total frames

-- Example user code (runs per band)
function process()
  -- Calculate frequency for current band (logarithmic scale)
  local freq = 80 * math.pow(8000/80, i/i_amt)

  -- Generate value for this band
  local value = math.sin(2 * math.pi * f/f_amt * freq/1000)

  return value
end
```

#### Execution Flow

1. **Code Change**: Editor triggers debounced execution
2. **Safety Check**: Lua syntax validation
3. **Outer Loop**: Engine handles frame/band iteration
4. **Per-Band Execution**: User code runs for each band
5. **Data Collection**: Results assembled into frames
6. **Visualization**: Canvas renders updated data

#### Engine Implementation

```typescript
// Pseudo-code for execution engine
function executeLuaScript(code: string) {
  const lua = new Wasmoon();

  // Inject global variables
  lua.global.set("i_amt", 20);
  lua.global.set("f_amt", 128);

  // Compile user code
  lua.doString(code);

  const frames: SpectralFrame[] = [];

  // Engine handles outer loops
  for (let f = 0; f < f_amt; f++) {
    lua.global.set("f", f);
    const bands: number[] = [];

    for (let i = 0; i < i_amt; i++) {
      lua.global.set("i", i);
      // Execute user code for this band
      const value = lua.global.get("process")();
      bands.push(value);
    }

    frames.push({ bands, timestamp: f });
  }

  return frames;
}
```

## UI/UX Patterns

### Retro Terminal Aesthetic & Theming System

- **Color Palette**: A strict color palette is enforced through CSS variables defined in `:root`. The primary colors are dark backgrounds (`--color-background`) and amber accents (`--color-amber`), with secondary and tertiary shades for depth.
- **CSS Variables**: All styling **must** be done using the global CSS variables. Hardcoding colors, spacing, or font sizes is not permitted. This ensures consistency and makes theme management trivial. The single source of truth for these variables is `src/styles/theme.ts`.
- **Typography**: `Fira Mono` is used for all text elements, with sizes and weights controlled by CSS variables.
- **Visual Elements**: The design is minimal and flat. Borders are thin and use theme colors (`--color-border`, `--color-border-muted`). Shadows are reserved for subtle glow effects on interactive elements (`--shadow-glow`).
- **Interactive States**: Hover and focus states are clearly indicated using variations of the primary amber color, controlled by `rgba(var(--color-glow-rgb), 0.1)`.

### CodeMirror Integration Patterns

#### Legacy Mode Compatibility Fix

**Pattern**: Handling undefined tags in legacy syntax highlighting modes

```typescript
// Apply workaround for "tags is not iterable" error with legacy modes
const originalStyle = baseHighlighter.style;
(baseHighlighter as { style: (tags: unknown) => unknown }).style = function (
  tags: unknown
) {
  return originalStyle.call(this, tags || []);
};
```

**Why Needed**: CodeMirror's legacy Lua mode can call the style function with undefined tags in certain build environments (especially Vite), causing "tags3 is not iterable" crashes.

**Implementation**: Patch the highlighter's style function to provide empty array fallback when tags are undefined/null.

#### Cyberdream Color Scheme Integration

**Pattern**: Professional syntax highlighting with consistent color mapping

```typescript
const baseHighlighter = HighlightStyle.define([
  { tag: t.keyword, color: "#bd5eff" }, // purple - for language keywords
  { tag: [t.name, t.variableName], color: "#5ea1ff" }, // blue - for variables
  { tag: t.function(t.variableName), color: "#5eff6c" }, // green - for functions
  { tag: t.string, color: "#f1ff5e" }, // yellow - for strings
  { tag: t.number, color: "#5ef1ff" }, // cyan - for numbers
  { tag: t.bool, color: "#ff5ea0" }, // pink - for booleans
  { tag: t.comment, color: "#7b8496", fontStyle: "italic" }, // grey - for comments
  { tag: t.operator, color: "#ff5555" }, // red - for operators
  { tag: t.punctuation, color: "#ffffff" }, // white - for punctuation
]);
```

**Benefits**:

- Professional appearance matching popular editor themes
- High contrast for better readability
- Semantic color coding that aids comprehension
- Consistent with cyberdream.nvim color philosophy

#### Intelligent Autocompletion System

**Pattern**: Context-aware completion with multiple providers

```typescript
// Spectral processing globals completion
const luaGlobalsCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  const options = [
    {
      label: "i",
      type: "variable",
      info: "Current band index (0 to i_amt-1)",
      detail: "number",
    },
    // ... more globals
  ];

  return { from: word.from, options };
};

// Dynamic local variables completion
const luaLocalVariablesCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  // Get document text up to current position for context-aware analysis
  const doc = context.state.doc;
  const fullText = doc.toString();
  const currentPos = context.pos;
  const beforeText = fullText.substring(0, currentPos);

  const localVars = new Set<string>();

  // Match multiple declaration patterns:
  // local var1, var2
  const localVarRegex =
    /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

  // function name(param1, param2)
  const functionParamRegex = /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/g;

  // for i=1,10 do / for k,v in pairs() do
  const forLoopRegex =
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g;

  // Extract and deduplicate variables
  [localVarRegex, functionParamRegex, forLoopRegex].forEach((regex) => {
    let match;
    while ((match = regex.exec(beforeText)) !== null) {
      const vars = match[1].split(",").map((v) => v.trim());
      vars.forEach((varName) => {
        if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          localVars.add(varName);
        }
      });
    }
  });

  // Convert to completion options with prefix filtering
  const options = Array.from(localVars)
    .filter((varName) =>
      varName.toLowerCase().startsWith(word.text.toLowerCase())
    )
    .map((varName) => ({
      label: varName,
      type: "variable",
      info: "Local variable",
      detail: "local",
    }));

  return options.length > 0 ? { from: word.from, options } : null;
};

// Standard library completion with filtering
const luaStdLibCompletion = (context: CompletionContext) => {
  const word = context.matchBefore(/[\w.]*$/);
  if (!word) return null;

  const options = [
    {
      label: "math.sin",
      type: "function",
      info: "Returns the sine of x (in radians)",
      detail: "math.sin(x)",
    },
    // ... more functions
  ];

  return {
    from: word.from,
    options: options.filter((option) =>
      option.label.toLowerCase().includes(word.text.toLowerCase())
    ),
  };
};
```

**Features**:

- **Three-Tier Completion**: Local variables → Spectral globals → Standard library
- **Context-Aware Analysis**: Only suggests variables declared before current cursor position
- **Multiple Declaration Support**: Handles various Lua patterns (local, functions, loops)
- **Smart Filtering**: Prefix matching for locals, fuzzy matching for standard library
- **Real-time Parsing**: Live code analysis without external dependencies
- **Performance Optimized**: Efficient regex parsing with Set deduplication

#### Professional Completion Styling

**Pattern**: Themed autocompletion popup with type-specific icons

```css
.cm-tooltip-autocomplete {
  backgroundColor: 'var(--color-background-secondary)',
  border: '1px solid var(--color-amber)',
  borderRadius: 'var(--border-radius-md)',
  boxShadow: 'var(--shadow-glow)',
}

.cm-completionIcon-function {
  backgroundColor: '#5eff6c', // green for functions
  color: '#000',
}

.cm-completionIcon-variable {
  backgroundColor: '#5ea1ff', // blue for variables
  color: '#000',
}
```

**Benefits**:

- **Visual Hierarchy**: Type-specific color coding improves recognition
- **Consistent Theming**: Matches overall cyberdream color scheme
- **Professional Appearance**: Clean, modern completion interface
- **Accessibility**: High contrast and clear visual indicators

#### Advanced Editor Extensions

**Pattern**: Comprehensive editor feature integration

```typescript
extensions={[
  StreamLanguage.define(lua),
  lineNumbers(),
  highlightActiveLineGutter(),
  foldGutter(),
  codeFolding(),
  autocompletion({
    override: [luaLocalVariablesCompletion, luaGlobalsCompletion, luaStdLibCompletion]
  }),
  keymap.of([...completionKeymap, ...runKeymap]),
  ...amberEditorTheme,
]}
```

**Features**:

- **Code Folding**: Function and block organization with visual indicators
- **Line Management**: Numbers, active line highlighting, fold gutters
- **Keyboard Integration**: Completion keymap combined with execution shortcuts
- **Multiple Providers**: Override mechanism for custom completion sources

#### Dynamic Code Analysis Pattern

**Pattern**: Real-time Lua code parsing for intelligent completion

```typescript
// Context-aware variable extraction
const extractLocalVariables = (code: string, position: number) => {
  const beforeText = code.substring(0, position);
  const variables = new Set<string>();

  // Multiple regex patterns for different declaration styles
  const patterns = [
    /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/g,
    /function\s*\(([^)]*)\)/g, // anonymous functions
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(beforeText)) !== null) {
      extractVariableNames(match[1], variables);
    }
  });

  return Array.from(variables);
};
```

**Benefits**:

- **Scope Awareness**: Variables only available after declaration
- **Multiple Patterns**: Comprehensive Lua syntax support
- **Efficient Processing**: Regex-based parsing with early termination
- **No External Dependencies**: Pure JavaScript implementation
- **Real-time Updates**: Immediate feedback as user types

#### Completion Priority System

**Pattern**: Ordered completion providers for optimal user experience

```typescript
// Provider order matters - local variables have highest priority
autocompletion({
  override: [
    luaLocalVariablesCompletion, // 1. User's variables (most relevant)
    luaGlobalsCompletion, // 2. Spectral processing context
    luaStdLibCompletion, // 3. Standard library functions
  ],
});
```

**Why This Order**:

- **User Context First**: Local variables are most relevant to current work
- **Domain Specific**: Spectral processing globals for the specific use case
- **General Purpose**: Standard library as fallback for common functions
- **Performance**: Most likely matches checked first

### Layout Strategy

- **Split Panel**: Editor on left, visualizer on right
- **Responsive**: Stack panels vertically on mobile
- **Minimal Chrome**: Hide unnecessary UI elements
- **Focus Management**: Clear visual hierarchy

### Border Hierarchy Pattern

**Pattern**: Single-border principle for nested components

```css
/* Parent container provides border */
.dro-panel {
  border: 1px solid var(--color-border-muted);
}

/* Child components should NOT have borders */
.dro-simple-spectrum-chart {
  border: none; /* Prevents double borders */
  border-radius: var(--border-radius-md); /* Maintains styling */
}
```

**Why Important**: Prevents visual "double border" effects that make UI look unprofessional.

**Rule**: Only the outermost container should have borders; inner components handle styling through background, radius, etc.

### UI Consistency Pattern

**Pattern**: Aligned control panel styling across components

```css
.dro-editor-footer,
.dro-chart-controls {
  padding: 12px;
  background: rgba(var(--color-background-rgb), 0.95);
  border-top: 1px solid var(--color-border-muted);
  font-size: 11px;
  color: var(--color-text-muted);
}
```

**Benefits**: Consistent appearance across editor and visualization controls

### Completion Documentation Pattern

**Pattern**: Rich tooltip integration with contextual help

```typescript
{
  label: 'math.sin',
  type: 'function',
  info: 'Returns the sine of x (in radians)',
  detail: 'math.sin(x)'
}
```

**Implementation**:

- **Concise Labels**: Clear function/variable names
- **Type Classification**: Semantic categorization for styling
- **Helpful Descriptions**: Brief but informative explanations
- **Usage Examples**: Parameter patterns and return types

## Performance Patterns

### Autocompletion Optimization

- **Debounced Triggers**: Prevent excessive completion calculations
- **Smart Filtering**: Efficient string matching with early termination
- **Lazy Loading**: Load completion data only when needed
- **Cached Results**: Memoize expensive completion generation

### Rendering Optimization

- **Debounced Execution**: Prevent excessive Lua calls
- **Canvas Reuse**: Efficiently update existing canvas elements
- **Frame Batching**: Group multiple frame updates
- **Memory Management**: Clean up WebAssembly memory

### Data Processing

- **Streaming Updates**: Process frames incrementally
- **Worker Thread**: Consider for heavy computations
- **Caching**: Memoize expensive calculations
- **Lazy Loading**: Load visualization data on demand

## Development Patterns

### Code Organization

- **Feature Folders**: Group related components/hooks/utils
- **Barrel Exports**: Clean import statements
- **Custom Hooks**: Reusable logic encapsulation
- **Type Safety**: Comprehensive TypeScript coverage

### Quality Assurance Patterns

#### Linter Error Prevention

**Pattern**: Clean TypeScript with proper type annotations

```typescript
// Instead of 'any', use proper typing
(baseHighlighter as { style: (tags: unknown) => unknown }).style = function (
  tags: unknown
) {
  return originalStyle.call(this, tags || []);
};

// Remove unused imports immediately
import { EditorView } from "@codemirror/view";
// import type { Extension } from '@codemirror/state'; // ❌ Remove if unused
```

**Benefits**:

- Zero linter warnings
- Better IDE support
- Improved maintainability
- Cleaner codebase

#### Completion Provider Testing

**Pattern**: Validate completion functionality across different contexts

```typescript
// Test completion in different contexts
const testCompletions = [
  { input: "ma", expectedContains: ["math.sin", "math.cos"] },
  { input: "i_", expectedContains: ["i_amt"] },
  { input: "f", expectedContains: ["f", "f_amt", "function"] },
];
```

### Testing Strategy

- **Unit Tests**: Core data processing logic
- **Component Tests**: React Testing Library
- **Integration Tests**: Lua engine interaction
- **Visual Tests**: Screenshot comparison for UI consistency
- **Completion Tests**: Autocompletion functionality validation

### Build & Deployment

- **Progressive Enhancement**: Core functionality without JavaScript
- **Code Splitting**: Lazy load editor and visualizer components
- **Tree Shaking**: Remove unused completion data
- **Bundle Analysis**: Monitor autocompletion impact on bundle size

## **Error Detection & Linting System** 🔴

### **Core Linting Architecture**

The error detection system uses CodeMirror's official linting extension with custom diagnostic providers:

```typescript
import { linter, lintGutter, Diagnostic } from "@codemirror/lint";

const luaLinter = linter((view) => {
  const doc = view.state.doc;
  const text = doc.toString();
  const diagnostics: Diagnostic[] = [];

  // Three-phase error detection
  checkSyntaxErrors(text, diagnostics, doc);
  checkUndefinedVariables(text, diagnostics, doc);
  checkCommonMistakes(text, diagnostics, doc);

  return diagnostics;
});
```

**Pattern Benefits:**

- **Official Integration**: Uses CodeMirror's native linting system for reliability
- **Modular Design**: Separate functions for different error types
- **Efficient Processing**: Single pass with targeted analysis for each error category
- **Non-blocking**: Runs asynchronously without interrupting editing

### **Visual Error Signaling Patterns**

#### **1. Squiggly Underlines System**

```css
.cm-diagnostic-error {
  border-bottom: "2px wavy var(--color-error)";
}
.cm-diagnostic-warning {
  border-bottom: "2px wavy var(--color-warning)";
}
.cm-diagnostic-info {
  border-bottom: "2px wavy #5ea1ff";
}
```

**Pattern Benefits:**

- **CSS-Only Implementation**: No JavaScript overhead for visual indicators
- **Theme Integration**: Uses CSS variables for consistent theming
- **Accessibility**: High contrast wavy lines clearly indicate issues
- **Performance**: CSS rendering is highly optimized

#### **2. Lint Gutter Integration**

```typescript
// In CodeMirror extensions array
extensions: [
  lintGutter(),
  luaLinter,
  // ... other extensions
];
```

**Pattern Benefits:**

- **Dedicated Space**: Separate gutter column prevents text interference
- **Quick Navigation**: Click on gutter markers to jump to errors
- **Visual Priority**: Color-coded dots show error severity at a glance
- **Space Efficient**: Minimal gutter width with maximum information density

### **Error Detection Algorithms**

#### **1. Syntax Error Detection**

```typescript
const checkSyntaxErrors = (
  text: string,
  diagnostics: Diagnostic[],
  doc: any
) => {
  const lines = text.split("\n");

  lines.forEach((line, lineIndex) => {
    // Bracket matching with string-aware parsing
    const brackets = { "(": ")", "[": "]", "{": "}" };
    const stack: string[] = [];
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = line[i - 1];

      // Handle string literals (escape-aware)
      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = "";
        }
      }

      // Only process brackets outside strings
      if (!inString) {
        // ... bracket matching logic
      }
    }
  });
};
```

**Pattern Benefits:**

- **Context-Aware**: Properly handles string literals and escape sequences
- **Stack-Based**: Efficient bracket matching with proper nesting validation
- **Line-by-Line**: Focused error reporting with precise locations
- **Escape Handling**: Correctly ignores escaped quotes in strings

#### **2. Undefined Variable Detection**

```typescript
const checkUndefinedVariables = (
  text: string,
  diagnostics: Diagnostic[],
  doc: any
) => {
  // Build comprehensive variable sets
  const localVars = new Set<string>();
  const globalVars = new Set([
    "i",
    "f",
    "i_amt",
    "f_amt", // Spectral processing
    "math",
    "print",
    "type",
    "tonumber",
    "tostring", // Lua standard
    "_G",
    "_VERSION",
    "assert",
    "collectgarbage", // Lua globals
    // ... complete Lua standard library
  ]);

  // Extract variable declarations with multiple pattern support
  const patterns = [
    /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/g,
    /function\s*\(([^)]*)\)/g,
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Extract and validate variable names
    }
  });
};
```

**Pattern Benefits:**

- **Comprehensive Coverage**: Handles all Lua variable declaration patterns
- **Scope Awareness**: Tracks local variables with proper scoping rules
- **Global Recognition**: Complete Lua standard library + domain-specific globals
- **Smart Filtering**: Ignores comments, strings, and property access patterns

### **Professional Error UI Integration**

#### **1. Hover Tooltip System**

```css
.cm-tooltip-lint {
  backgroundColor: 'var(--color-background-secondary)',
  border: '1px solid var(--color-border-muted)',
  borderRadius: 'var(--border-radius-md)',
  boxShadow: 'var(--shadow-glow)',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  maxWidth: '400px',
  padding: '8px 12px',
  color: 'var(--color-text-primary)',
}

.cm-tooltip-lint .cm-diagnostic-error {
  borderLeft: '3px solid var(--color-error)',
  paddingLeft: '8px',
}
```

**Pattern Benefits:**

- **Theme Consistency**: Matches cyberdream color scheme throughout
- **Professional Typography**: Monospace font for code-related tooltips
- **Severity Indicators**: Color-coded left borders for quick error type recognition
- **Responsive Design**: Adapts to content length with maximum width constraints

#### **2. Non-Intrusive Error Display**

```typescript
// Error detection runs without blocking editing
const diagnostics: Diagnostic[] = [];

// Errors are visual indicators only - no editing restrictions
return diagnostics; // CodeMirror handles display automatically
```

**Pattern Benefits:**

- **Non-blocking**: Errors never prevent typing or code execution
- **Real-time**: Updates immediately as code changes
- **Visual Only**: Provides feedback without workflow interruption
- **Performance**: Efficient updates without full re-analysis

## **Autocompletion System** 📋

### **Three-Tier Completion Architecture**

```typescript
autocompletion({
  override: [
    luaLocalVariablesCompletion, // 1. User's variables (most relevant)
    luaGlobalsCompletion, // 2. Spectral processing context
    luaStdLibCompletion, // 3. Standard library functions
  ],
});
```

**Pattern Benefits:**

- **Priority-Based**: Most relevant suggestions appear first
- **Comprehensive Coverage**: Local variables → Domain globals → Standard library
- **Context Aware**: Local variables only suggested after declaration
- **Performance Optimized**: Efficient filtering and caching strategies

### **Dynamic Local Variable Analysis**

```typescript
const luaLocalVariablesCompletion = (context: CompletionContext) => {
  const doc = context.state.doc;
  const fullText = doc.toString();
  const currentPos = context.pos;
  const beforeText = fullText.substring(0, currentPos);

  // Multiple declaration pattern recognition
  const patterns = [
    /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/g,
    /function\s*\(([^)]*)\)/g,
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g,
  ];

  const localVars = new Set<string>();
  patterns.forEach((pattern) => {
    // Extract variables with proper validation
  });

  return {
    from: word.from,
    options: Array.from(localVars).map((varName) => ({
      label: varName,
      type: "variable",
      info: "Local variable",
      detail: "local",
    })),
  };
};
```

**Pattern Benefits:**

- **Real-time Analysis**: Parses code dynamically for current context
- **Multiple Patterns**: Supports all Lua variable declaration styles
- **Scope Respect**: Only suggests variables declared before cursor
- **Performance**: Set-based deduplication and efficient regex patterns

## **Editor Enhancement Patterns** ✨

### **Professional Code Folding**

```typescript
extensions: [
  foldGutter(),
  codeFolding(),
  // ... other extensions
];
```

**Pattern Benefits:**

- **Code Organization**: Function and block-level folding for large scripts
- **Visual Hierarchy**: Clear code structure with expandable sections
- **Interactive Control**: Click-based folding with hover indicators
- **Performance**: Only renders visible code sections

### **Advanced Gutter System**

```typescript
extensions: [
  lineNumbers(),
  highlightActiveLineGutter(),
  foldGutter(),
  lintGutter(),
  // ... completion and other features
];
```

**Pattern Benefits:**

- **Multi-functional**: Line numbers, folding, errors, and active line in one system
- **Space Efficient**: Compact layout with maximum information density
- **Visual Hierarchy**: Clear separation of different gutter functions
- **Professional Appearance**: Consistent styling matching cyberdream theme

## **Theme Integration Patterns** 🎨

### **Consistent Cyberdream Styling**

```css
// Error colors match theme palette
'--color-error': '#ff5555',     // red
'--color-warning': '#ffbd5e',   // orange
'--color-info': '#5ea1ff',      // blue

// All UI elements use CSS variables for consistency
.cm-diagnostic-error {
  borderBottom: '2px wavy var(--color-error)';
}

.cm-tooltip-lint {
  backgroundColor: 'var(--color-background-secondary)',
  border: '1px solid var(--color-border-muted)',
}
```

**Pattern Benefits:**

- **Theme Consistency**: All colors sourced from centralized CSS variables
- **Visual Harmony**: Error UI seamlessly integrates with existing design
- **Maintainability**: Single source of truth for color changes
- **Accessibility**: High contrast ratios maintained throughout

### **Professional Visual Hierarchy**

```css
// Type-specific completion icons
.cm-completionIcon-function {
  backgroundcolor: "#5eff6c";
} // green
.cm-completionIcon-variable {
  backgroundcolor: "#5ea1ff";
} // blue
.cm-completionIcon-constant {
  backgroundcolor: "#5ef1ff";
} // cyan
.cm-completionIcon-keyword {
  backgroundcolor: "#bd5eff";
} // purple
```

**Pattern Benefits:**

- **Visual Coding**: Colors convey meaning instantly
- **Professional Appearance**: IDE-quality visual indicators
- **Cognitive Load**: Reduces mental effort to categorize suggestions
- **Consistency**: Matches cyberdream color palette throughout

## **Performance Optimization Patterns** ⚡

### **Efficient Error Detection**

```typescript
// Single-pass analysis with targeted checks
const luaLinter = linter((view) => {
  const text = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];

  // Batch all checks in single iteration when possible
  checkSyntaxErrors(text, diagnostics, doc);
  checkUndefinedVariables(text, diagnostics, doc);
  checkCommonMistakes(text, diagnostics, doc);

  return diagnostics;
});
```

**Pattern Benefits:**

- **Minimal Overhead**: Single document parsing for all error types
- **Targeted Analysis**: Focused regex patterns for specific issues
- **Batch Processing**: Groups related checks for efficiency
- **Debounced Updates**: CodeMirror handles update throttling automatically

### **Smart Completion Caching**

```typescript
// Local variables extracted once per context change
const localVars = new Set<string>();
patterns.forEach((pattern) => {
  // Efficient regex with Set-based deduplication
});

// Prefix filtering for performance
const filteredOptions = options.filter((option) =>
  option.label.toLowerCase().startsWith(word.text.toLowerCase())
);
```

**Pattern Benefits:**

- **Set-Based Operations**: O(1) lookups and deduplication
- **Prefix Matching**: Fast filtering without complex algorithms
- **Lazy Evaluation**: Only processes visible completion options
- **Memory Efficient**: Minimal object creation during completion

```

```
