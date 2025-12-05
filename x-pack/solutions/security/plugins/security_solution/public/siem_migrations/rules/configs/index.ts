/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationSource } from '../types';

import type {
  QradarMigrationSteps,
  SplunkMigrationSteps,
} from '../components/data_input_flyout/types';
import { SPLUNK_MIGRATION_STEPS } from './splunk';
import { QRADAR_MIGRATION_STEPS } from './qradar';

export const STEP_COMPONENTS: {
  [MigrationSource.SPLUNK]: SplunkMigrationSteps;
  [MigrationSource.QRADAR]: QradarMigrationSteps;
} = {
  [MigrationSource.SPLUNK]: SPLUNK_MIGRATION_STEPS,
  [MigrationSource.QRADAR]: QRADAR_MIGRATION_STEPS,
};
