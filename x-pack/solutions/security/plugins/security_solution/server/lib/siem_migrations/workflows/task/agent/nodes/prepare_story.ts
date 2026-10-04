/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphNode } from '../types';

/**
 * Prepares graph state from the original workflow item (identity for POC).
 */
export const getPrepareStoryNode = (): GraphNode => {
  return async (state) => ({
    id: state.id,
    original_workflow: state.original_workflow,
  });
};
