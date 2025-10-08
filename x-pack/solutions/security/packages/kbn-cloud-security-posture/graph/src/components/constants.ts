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
  NODE_LABEL_HEIGHT,
  NODE_LABEL_DETAILS,
} from './node/styles';
