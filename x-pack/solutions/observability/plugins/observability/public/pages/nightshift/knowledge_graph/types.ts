/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureFeature } from '../fixtures';

export type VisibleFeatureType = 'entity' | 'infrastructure' | 'technology' | 'schema';

export interface KiNodeData {
  feature: FixtureFeature;
  width: number;
  height: number;
  color: string;
  borderColor: string;
  selected: boolean;
  isPhantom?: boolean;
  dimmed?: boolean;
}

export interface TypeFilters {
  entity: boolean;
  infrastructure: boolean;
  technology: boolean;
  schema: boolean;
}

export const NODE_RADIUS = 20;

export const NODE_DIMENSIONS: Record<VisibleFeatureType, { width: number; height: number }> = {
  entity: { width: 40, height: 40 },
  infrastructure: { width: 36, height: 36 },
  technology: { width: 36, height: 36 },
  schema: { width: 32, height: 32 },
};
