/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_SIZE } from '../constants';

export const LAYOUT_GRID_SIZE_OFFSET = GRID_SIZE * 2;

/**
 * Horizontal gap between ranks (entity ↔ label ↔ entity).
 * Kept compact so columns sit close without touching — see design example `exemplo.pdf`.
 */
export const GRAPH_LAYOUT_RANK_SEP = LAYOUT_GRID_SIZE_OFFSET * 8;

/**
 * Vertical gap between nodes in the same rank.
 * Roughly one compact card of breathing room between siblings.
 */
export const GRAPH_LAYOUT_NODE_SEP = LAYOUT_GRID_SIZE_OFFSET * 8;

/**
 * Minimum gap enforced between node bounding boxes after post-layout overlap resolution.
 * Small safety margin so alignment passes do not leave nodes touching.
 */
export const GRAPH_LAYOUT_MIN_NODE_GAP = LAYOUT_GRID_SIZE_OFFSET * 2;
