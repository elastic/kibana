/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesDataInput } from '../components/data_input_flyout/steps/rules/rules_data_input';
import { MacrosDataInput } from '../components/data_input_flyout/steps/macros/macros_data_input';
import { LookupsDataInput } from '../components/data_input_flyout/steps/lookups/lookups_data_input';
import { MigrationSource } from '../types';
import {
  QradarDataInputStepId,
  SplunkDataInputStepId,
} from '../components/data_input_flyout/steps/constants';
import type {
  QradarMigrationSteps,
  SplunkMigrationSteps,
} from '../components/data_input_flyout/types';

const SPLUNK_MIGRATION_STEPS: SplunkMigrationSteps = [
  { id: SplunkDataInputStepId.Rules, Component: RulesDataInput },
  { id: SplunkDataInputStepId.Macros, Component: MacrosDataInput },
  { id: SplunkDataInputStepId.Lookups, Component: LookupsDataInput },
] as const;

const QRADAR_MIGRATION_STEPS: QradarMigrationSteps = [
  { id: QradarDataInputStepId.Rules, Component: RulesDataInput },
] as const;

export const STEP_COMPONENTS: {
  [MigrationSource.SPLUNK]: SplunkMigrationSteps;
  [MigrationSource.QRADAR]: QradarMigrationSteps;
} = {
  [MigrationSource.SPLUNK]: SPLUNK_MIGRATION_STEPS,
  [MigrationSource.QRADAR]: QRADAR_MIGRATION_STEPS,
};
