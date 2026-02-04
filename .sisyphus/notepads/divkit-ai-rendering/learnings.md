# Learnings - divkit-ai-rendering

Conventions, patterns, and insights discovered during execution.

---

## Task 1: ClapAIDivKit Utility Creation (2026-02-04)

### Implementation Details

- Created `src/utils/ClapAIDivKit.ts` with type-safe utility functions
- Defined TypeScript interfaces: `ClapAIContent`, `ClapAIPalette`, `DivKitCard`, `DivKitCardVariable`
- Implemented three core functions:
    1. `extractDivKitCard(content)` - Safely extracts card from ac.clap.ai namespace
    2. `getPaletteVariables(palette, theme)` - Converts palette colors to DivKit variables
    3. `getCardVariables(card)` - Converts card.variables to DivKit Variable instances

### DivKit Type System Learnings

- `AnyVariable` type is NOT exported from `@divkitframework/divkit/client`
- Must import types from `@divkitframework/divkit/typings/variables` directly
- `createVariable<T>(name, type, value)` returns specific Variable subclass based on type parameter
- Supported variable types: 'string' | 'number' | 'integer' | 'boolean' | 'color' | 'url' | 'dict' | 'array'

### Code Patterns Established

- Null-safe extraction: Return `null` when ac.clap.ai or card is missing
- Array validation: Check both existence and `Array.isArray()` before mapping
- Theme handling: Support both 'light' and 'dark' themes with graceful fallback to empty array
- JSDoc documentation: Public API functions documented for IDE autocomplete

### TypeScript Compliance

- All types strictly defined (no `any` usage)
- Proper type imports from DivKit typings
- `yarn lint:types` passes with no errors (33.91s build time)

### Next Steps

- This utility will be consumed by the DivKit renderer component (Task 2)
- Variables will be passed to DivKit's `render()` function via `globalVariablesController`

## Task 2: DivKitBody Component

### DivKit API Patterns

- `createGlobalVariablesController()` returns controller with `setVariable(variable)` method (singular, not plural)
- Must loop through variables and call `setVariable()` for each one
- `render()` expects `json: DivJson` where `DivJson.card` has strict typing for `states: DivJsonState[]`
- Type casting needed: `card as DivJson["card"]` when card comes from external JSON

### Theme Detection

- `useTheme()` returns `{ theme: string, systemThemeActivated: boolean }`
- Theme string can be "light", "dark", or include "dark" (e.g., "dark-high-contrast")
- Use `theme.includes("dark")` for reliable dark mode detection

### Component Structure

- Use `React.forwardRef` for IBodyProps compatibility
- `containerRef` for DivKit target element
- Cleanup: `containerRef.current.innerHTML = ""` in useEffect return
- Return `null` when no card found (graceful fallback)

### CSS Import

- Import at component level: `import "@divkitframework/divkit/dist/client.css"`
- No need for global import in index.html

## Task 3: MessageEvent.tsx Routing Integration (2026-02-04)

### Integration Pattern

- Added DivKit routing in `MessageEvent.tsx` render() method
- Imports: `DivKitBody` component and `extractDivKitCard`, `ClapAIContent` from ClapAIDivKit utility
- Placement: After location body type check (line ~278), before Mjolnir check
- Logic: Extract card from content, override BodyType if card exists

### Code Structure

```typescript
// Check for DivKit card in Clap AI messages
const clapAIContent = content as ClapAIContent;
const divKitCard = extractDivKitCard(clapAIContent);
if (divKitCard) {
    BodyType = DivKitBody;
}
```

### Key Insights

- Type casting `content as ClapAIContent` allows TypeScript to recognize ac.clap.ai namespace
- `extractDivKitCard()` returns null-safe value, so simple `if (divKitCard)` check works
- BodyType override happens AFTER all other type checks, giving DivKit highest priority
- Existing message types (images, files, etc.) remain unaffected - only AI messages with cards route to DivKitBody

### Verification

- `yarn lint:types` passes (39.60s)
- Prettier formatting check passes
- Commit: `feat(ai): route AI messages with DivKit cards to DivKitBody`

### Message Flow

1. Event arrives in MessageEvent.tsx render()
2. Content extracted and type determined (image, file, text, etc.)
3. NEW: Check for ac.clap.ai.card in content
4. If card exists → override BodyType to DivKitBody
5. DivKitBody receives mxEvent and renders card via DivKit framework

## Task 4: Button Action Handling (2026-02-04)

### Implementation Details

- Added `handleClapAction()` function to ClapAIDivKit.ts
- Added `onCustomAction` callback to DivKitBody.tsx render() call
- Button clicks now send messages with action metadata

### DivKit Action System

- `onCustomAction` callback receives `Action & { url: string }` type
- Action object contains: `log_id`, `url`, `payload`, etc.
- Button text is NOT in action object - must search card JSON

### Button Text Extraction

- Created `findButtonTextByAction()` recursive function
- Searches card JSON for element with matching action (by log_id or url)
- Returns element's `text` property if found
- Fallback: use `action.log_id` if button text not found

### Matrix Message Sending

- Use `cli.sendEvent(roomId, EventType.RoomMessage, content)` for custom content
- `sendMessage()` has strict typing that rejects custom fields
- Type assertion `as RoomMessageEventContent` needed for custom `ac.clap.action` field

### Message Format

```typescript
{
  msgtype: "m.text",
  body: buttonText,
  "ac.clap.action": {
    url: "clap://...",
    log_id: "action_id"
  }
}
```

### Protocol Filtering

- Only handle `clap://` protocol URLs
- Non-clap protocols logged as warning and ignored

### Key Patterns

- DivKit card structure: elements have `actions` array or single `action` property
- Child elements in: `items`, `div`, `states` properties
- Recursive search needed for nested button elements

## Task 5: Error Boundary for DivKit Rendering (2026-02-04)

### Error Boundary Architecture

- Created `DivKitErrorBoundary.tsx` - a dedicated error boundary for DivKit rendering failures
- Separate from `TileErrorBoundary` which requires `layout` prop (not available in MessageEvent)
- Simpler design: only needs `mxEvent` prop to access fallback text

### Implementation Details

- Class component extending `React.Component<IProps, IState>`
- Implements `getDerivedStateFromError()` to capture errors
- Implements `componentDidCatch()` to log errors to console
- Fallback UI displays original message body text from `content.body`

### Integration Pattern

- Wrapped DivKitBody in MessageEvent.tsx render() method
- Only wraps when `BodyType === DivKitBody`
- Prevents app crashes from malformed DivKit cards
- Maintains graceful degradation - users see original message text

### Error Handling Flow

1. DivKit render() throws error in useEffect
2. Error bubbles up to DivKitErrorBoundary
3. getDerivedStateFromError() captures error
4. componentDidCatch() logs to console: `[DivKitErrorBoundary] DivKit rendering failed:`
5. Fallback UI renders with original message body

### Key Insights

- DivKit's onError callback (in render options) logs errors but doesn't prevent crashes
- React Error Boundaries are needed to catch rendering errors in useEffect
- Fallback text from `content.body` provides user-friendly degradation
- No need for complex error UI - simple text display is sufficient

### TypeScript Patterns

- Type content as `ClapAIContent` to access `.body` property
- Fallback text: `content?.body || "Failed to render message"`
- Error boundary state: `{ error?: Error }`

### Verification

- `yarn lint:types` passes (32.82s)
- Commit: `feat(ai): add error boundary for DivKit rendering failures`
