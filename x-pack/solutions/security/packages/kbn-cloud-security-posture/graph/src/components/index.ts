/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel } from './types';

export { Graph } from './graph/graph';
export { GraphInvestigation } from './graph_investigation/graph_investigation';
export { GraphPopover } from './graph/graph_popover';
export { useGraphPopover } from './graph/use_graph_popover';
export type { GraphProps } from './graph/graph';
export type {
  NodeViewModel,
  EdgeViewModel,
  GroupNodeViewModel,
  LabelNodeViewModel,
  EntityNodeViewModel,
  NodeProps,
} from './types';

export const isEntityNode = (node: NodeViewModel) =>
  node.shape === 'ellipse' ||
  node.shape === 'pentagon' ||
  node.shape === 'rectangle' ||
  node.shape === 'diamond' ||
  node.shape === 'hexagon';
