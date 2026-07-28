/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_SIZE } from '../constants';

export const LAYOUT_GRID_SIZE_OFFSET = GRID_SIZE * 2;

/** Dagre minimum separation between ranks (horizontal gaps in LR layout). */
export const GRAPH_LAYOUT_RANK_SEP = LAYOUT_GRID_SIZE_OFFSET * 14;

/** Dagre minimum separation between nodes in the same rank (vertical gaps in LR layout). */
export const GRAPH_LAYOUT_NODE_SEP = LAYOUT_GRID_SIZE_OFFSET * 20;

/** Minimum gap enforced between node bounding boxes after post-layout overlap resolution. */
export const GRAPH_LAYOUT_MIN_NODE_GAP = LAYOUT_GRID_SIZE_OFFSET * 3;
