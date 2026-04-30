/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Steps } from '../../../../common/types';
import { MigrationSource } from '../../../../common/types';
import { SPLUNK_MIGRATION_STEPS } from './splunk';
import { SENTINEL_MIGRATION_STEPS } from './sentinel';

export const STEP_COMPONENTS: {
  [MigrationSource.SPLUNK]: Steps;
  [MigrationSource.SENTINEL]: Steps;
} = {
  [MigrationSource.SPLUNK]: SPLUNK_MIGRATION_STEPS,
  [MigrationSource.SENTINEL]: SENTINEL_MIGRATION_STEPS,
};
