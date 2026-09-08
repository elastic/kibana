/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStore, type ReactFlowState } from '@xyflow/react';
import { getDetailLevel, type DetailLevel } from './detail_level';

/**
 * Selector that derives the discrete detail level from the ReactFlow store's
 * zoom scale. Returning the discrete band (not the raw zoom) means `useStore`
 * only triggers a re-render when the band actually flips, not on every zoom
 * tick. Reading directly from the store lets every node component consume the
 * detail level regardless of where ReactFlow renders it in the tree — a React
 * context provider cannot wrap ReactFlow's internally-rendered node subtree.
 */
const detailLevelSelector = (s: ReactFlowState): DetailLevel => getDetailLevel(s.transform[2]);

export const useDetailLevel = (): DetailLevel => useStore(detailLevelSelector);
