/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationStats } from '../../types';

export type OnMigrationCreated = (migrationStats: RuleMigrationStats) => void;
export type OnResourcesCreated = () => void;

export enum QradarDataInputStepId {
  Rules = 'qradar_rules',
  ReferenceSet = 'qradar_reference_set',
  Enhancements = 'qradar_enhancements',
}

export enum QradarDataInputStep {
  Rules = 1,
  ReferenceSet = 2,
  Enhancements = 3,
  End = 10,
}
