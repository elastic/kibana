/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformHealth } from '../../../domain/models/health';

export interface HealthDocument {
  '@timestamp': string;
  scanId: string;
  spaceId: string;
  slo: {
    id: string;
    revision: number;
    name: string;
    enabled: boolean;
  };
  health: {
    isProblematic: boolean;
    rollup: TransformHealth;
    summary: TransformHealth;
  };
}
