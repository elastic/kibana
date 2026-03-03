/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformHealthResponse } from '@kbn/slo-schema';

export const aMissingTransformHealth: TransformHealthResponse = {
  isProblematic: true,
  missing: true,
  status: 'unavailable',
  state: 'unavailable',
};

export const aHealthyTransformHealth: TransformHealthResponse = {
  isProblematic: false,
  missing: false,
  status: 'healthy',
  state: 'started',
  stateMatches: true,
};

export const anUnhealthyTransformHealth: TransformHealthResponse = {
  isProblematic: true,
  missing: false,
  status: 'unhealthy',
  state: 'started',
  stateMatches: true,
};

export const aConflictingTransformHealth: TransformHealthResponse = {
  isProblematic: true,
  missing: false,
  status: 'healthy',
  state: 'stopped',
  stateMatches: false,
};
