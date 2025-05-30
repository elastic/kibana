/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel } from './types';

export const isEntityNode = (node: NodeViewModel) =>
  node.shape === 'ellipse' ||
  node.shape === 'pentagon' ||
  node.shape === 'rectangle' ||
  node.shape === 'diamond' ||
  node.shape === 'hexagon';
