# Label Nodes Appearance Update

This document describes the changes made to update the appearance of label nodes in the Graph visualization to better distinguish between alerts and events.

## Changes Made

### 1. Visual Styling
- **Alert labels**: Use `euiTheme.colors.danger` background with `euiTheme.colors.backgroundBasePlain` text color
- **Event labels**: Use `euiTheme.colors.backgroundBasePrimary` background with `euiTheme.colors.textPrimary` text color
- **Dragging effect**: Added shadow filter when nodes are being dragged

### 2. Badge System
Label nodes now display badges based on their content:

- **Single event**: No badge
- **Single alert**: White squared badge with red "warningFilled" icon
- **Group of events**: White squared badge with "+X" counter (where X is the total count)
- **Group of alerts**: White squared badge with warning icon and "+X" counter
- **Mixed group**: Both badges (events badge and alerts badge)

### 3. Tooltip System
- All label nodes with documents show a tooltip with title "Performed action"
- Lists all events and alerts contained in the node
- Shows frequency badges for high-frequency items (>99 repetitions)
- Distinguishes between alert events (red badges) and default events (white badges)

### 4. Reusable Components
Created reusable components for future use:
- `<Ips>`: Displays IP addresses with tooltips and counters
- `<CountryFlags>`: Displays country flags with localized names and counters

## Component Structure

```
src/components/node/
├── label_node.tsx                 # Updated main label node component
├── label_node.stories.tsx         # Storybook stories for testing
├── label_node.test.tsx            # Integration tests
├── label_node_helpers/
│   ├── analyze_documents.ts       # Document analysis utilities
│   ├── label_node_badges.tsx      # Badge rendering logic
│   └── label_node_tooltip.tsx     # Tooltip content component
├── ips/
│   ├── ips.tsx                    # IP address display component
│   └── ips.test.tsx              # Tests
└── country_flags/
    ├── country_flags.tsx          # Country flag display component
    ├── country_codes.ts           # Country code utilities
    └── country_flags.test.tsx     # Tests
```

## Usage

The label node automatically determines its appearance based on the `documentsData` field:

```typescript
const labelNodeData = {
  id: 'example-label',
  label: 'Security Activity',
  color: 'primary', // Will be overridden based on content
  shape: 'label',
  documentsData: [
    { id: 'alert1', type: 'alert' },
    { id: 'event1', type: 'event' },
  ],
};
```

This will render a label with danger styling (due to alerts) and both event and alert badges.