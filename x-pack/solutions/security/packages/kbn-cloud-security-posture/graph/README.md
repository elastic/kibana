# Cloud Security Posture's Graph

## Motivation

The idea behind this package is to have a reusable graph component, embedding the features available to the alert's flyout in
security solution plugin.

## License Requirements

Graph Visualization requires specific license tiers depending on your deployment type:

- **ESS/Self-Managed**: Platinum license or higher (Platinum, Enterprise, or Trial)
- **Serverless**: Security Analytics Complete tier (not available in Essentials tier)

The feature will not be available if the required license tier is not met.

## How to use this

### Step 1: Import the Component

First, import the `Graph` component into your desired file.

```tsx
import { Graph } from '@kbn/cloud-security-posture-graph';
```

### Step 2: Prepare the Data

Create the nodes and edges data models. These should follow the `NodeViewModel` and `EdgeViewModel` interfaces.

```tsx
const nodes: NodeViewModel[] = [
  {
    id: 'node1',
    label: 'Node 1',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 'node2',
    label: 'Node 2',
    color: 'primary',
    shape: 'hexagon',
    icon: 'question',
  },
];

const edges: EdgeViewModel[] = [
  {
    id: 'edge1',
    source: 'node1',
    target: 'node2',
    color: 'primary',
  },
];
```

### Step 3: Render the Component

Use the `Graph` component in your JSX/TSX, passing the nodes, edges, and interactivity flag as props.

```tsx
<Graph nodes={nodes} edges={edges} interactive={true} />
```

### Example Usage

Here is a complete example of how to use the `Graph` component in a React component.

```tsx
import React from 'react';
import { Graph } from '@kbn/cloud-security-posture-graph';
import type { NodeViewModel, EdgeViewModel } from '@kbn/cloud-security-posture-graph';

const App: React.FC = () => {
  const nodes: NodeViewModel[] = [
    {
      id: 'node1',
      label: 'Node 1',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
    },
    {
      id: 'node2',
      label: 'Node 2',
      color: 'primary',
      shape: 'hexagon',
      icon: 'question',
    },
  ];

  const edges: EdgeViewModel[] = [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      color: 'primary',
    },
  ];

  return (
    <div>
      <h1>Graph Visualization</h1>
      <Graph nodes={nodes} edges={edges} interactive={true} />
    </div>
  );
};

export default App;
```

### Storybook Example

You can also see how the `Graph` component is used in the Storybook file `graph_layout.stories.tsx`.

### Extras

Be sure to check out provided helpers

## Storybook

General look of the component can be checked visually running the following storybook:
`yarn storybook cloud_security_posture_graph`

Note that all the interactions are mocked.

## Grouped Item Click Event Bus

When using `GraphGroupedNodePreviewPanel` the list of grouped entities / events renders clickable titles. Instead of wiring an `onOpenItem` callback (which would break URL serialization for flyout state) the package exposes an RxJS Subject:

```ts
import { groupedItemClick$, emitGroupedItemClick } from '@kbn/cloud-security-posture-graph';
```

### Consumption Pattern

```ts
useEffect(() => {
  const sub = groupedItemClick$.subscribe((item) => {
    // Decide how to open your own preview panel here
  });
  return () => sub.unsubscribe();
}, []);
```

The Security Solution plugin, for example, maps:

- `DOCUMENT_TYPE_ENTITY` -> Generic entity flyout
- `DOCUMENT_TYPE_EVENT` -> Event document details
- `DOCUMENT_TYPE_ALERT` -> Alert document details

### Duplicate Suppression

Rapid double clicks on the same item id (within 250ms) are ignored to prevent accidental duplicate flyout openings. For testing there is a private helper `__resetGroupedItemClickDedupe()`.

### Rationale

- Keeps this package decoupled from plugin‑specific imports (banners, panel keys, etc.)
- Avoids leaking non‑serializable functions into flyout state persisted in the URL.
- Keeps API surface minimal and future‑proof.

### Future Ideas

- Provide a `useGroupedItemClick` convenience hook.
- Telemetry collection on click events.
- Additional events (context menu, long press) if UX evolves.
