/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Discrete render mode derived from the current graph zoom. */
export type DetailLevel = 'simplified' | 'detailed';

/**
 * Zoom scale at/above which nodes render their detailed card. Below it they
 * render the simplified icon tile. Tuned against the Figma zoom bands.
 */
export const DETAIL_LEVEL_ZOOM_THRESHOLD = 0.7;

export const getDetailLevel = (zoom: number): DetailLevel =>
  zoom >= DETAIL_LEVEL_ZOOM_THRESHOLD ? 'detailed' : 'simplified';
