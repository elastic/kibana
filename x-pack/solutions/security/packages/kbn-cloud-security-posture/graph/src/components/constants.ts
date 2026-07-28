/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Whether or not to instruct the graph component to only render nodes and edges that would be visible in the viewport.
 */
export const ONLY_RENDER_VISIBLE_ELEMENTS = true as const;

/**
 * The size of the grid used for layout and snapping, in pixels.
 */
export const GRID_SIZE = 10;

/**
 * Graph canvas background fill from Figma token `Graph Visualizer/Grid`.
 * @see https://www.figma.com/design/NKGsPiGKZ4rEwRVBnuctZ2
 */
export const GRAPH_BACKGROUND_COLOR = '#F7F8FC';

/**
 * Dot pattern color for the graph canvas background.
 * Slightly stronger than the Figma export anti-alias color so dots remain
 * visible at 1–2px on `#F7F8FC`.
 */
export const GRAPH_BACKGROUND_DOT_COLOR = '#C5CCD6';

/**
 * Spacing between background dots, in pixels (matches Figma grid).
 */
export const GRAPH_BACKGROUND_DOT_GAP = 24;

/**
 * Radius diameter for background dots, in pixels.
 */
export const GRAPH_BACKGROUND_DOT_SIZE = 2;

/**
 * The vertical padding between nodes when being stacked, in pixels.
 */
export const STACK_NODE_VERTICAL_PADDING = 20;

/**
 * The horizontal padding between nodes when being stacked, in pixels.
 */
export const STACK_NODE_HORIZONTAL_PADDING = 20;

/**
 * graph package scope id - to be used by flyout hook
 */
export const GRAPH_SCOPE_ID = 'graph';

/** Viewport zoom below which nodes render in simplified form (pill-only, icon-only). */
export const GRAPH_SIMPLIFIED_ZOOM_THRESHOLD = 0.75;

/**
 * Furthest zoom-out allowed. Below this, nodes/edges become unreadable.
 * Kept high enough that simplified nodes (~48px icons) stay scannable on screen.
 */
export const GRAPH_MIN_ZOOM = 0.5;

/** Furthest zoom-in allowed. */
export const GRAPH_MAX_ZOOM = 1.3;

/**
 * Max CSS counter-scale applied by zoom-invariant wrappers.
 * Caps enlargement when zooming out so nodes stay readable without overlapping
 * neighbors (must stay ≤ 1 + rank/node separation ÷ node size).
 */
export const GRAPH_ZOOM_INVARIANT_MAX_SCALE = 1.35;

export const i18nNamespaceKey = 'securitySolutionPackages.csp.graph.flyout.networkPreviewPanel';

export const NETWORK_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.bannerTitle`, {
    defaultMessage: 'Preview network details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export {
  NODE_WIDTH,
  NODE_HEIGHT,
  ENTITY_NODE_TOTAL_HEIGHT,
  NODE_LABEL_TOTAL_HEIGHT,
  NODE_LABEL_WIDTH,
  ENTITY_NODE_LABEL_WIDTH,
  NODE_LABEL_HEIGHT,
  NODE_LABEL_DETAILS,
} from './node/styles';
