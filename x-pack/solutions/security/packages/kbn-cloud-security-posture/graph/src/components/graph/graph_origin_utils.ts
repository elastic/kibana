/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEntityNode, isLabelNode } from '../utils';
import type { NodeViewModel } from '../types';

/** CSS class applied to origin entity and event/alert nodes when origin highlighting is active. */
export const GRAPH_ORIGIN_NODE_CLASS = 'graph-origin-node';

/** Opacity for non-origin nodes while origin highlighting is enabled. */
export const GRAPH_NON_ORIGIN_NODE_OPACITY = 0.6;

/**
 * Origin nodes are the starting entities, events, or alerts rendered when the graph
 * investigation opens — not relationship connectors or expanded graph additions.
 */
export const isOriginEntityOrEventNode = (node: NodeViewModel): boolean => {
  if (isLabelNode(node)) {
    return Boolean(node.isOrigin || node.isOriginAlert);
  }

  if (isEntityNode(node)) {
    return Boolean(node.isOrigin);
  }

  return false;
};
