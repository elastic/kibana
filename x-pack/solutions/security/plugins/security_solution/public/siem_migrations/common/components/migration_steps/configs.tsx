/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationSource } from '../../types';
import { DataInputStepId } from '../../../rules/components/data_input_flyout/steps/constants';
import { RulesDataInput } from '../../../rules/components/data_input_flyout/steps/rules/rules_data_input';
import { MacrosDataInput } from '../../../rules/components/data_input_flyout/steps/macros/macros_data_input';
import { LookupsDataInput } from '../../../rules/components/data_input_flyout/steps/lookups/lookups_data_input';
import type { QradarMigrationSteps, SplunkMigrationSteps } from '../migration_source_step/types';

const SPLUNK_MIGRATION_STEPS: SplunkMigrationSteps = [
  { id: DataInputStepId.SplunkRules, Component: RulesDataInput },
  { id: DataInputStepId.SplunkMacros, Component: MacrosDataInput },
  { id: DataInputStepId.SplunkLookups, Component: LookupsDataInput },
] as const;

const QRADAR_MIGRATION_STEPS: QradarMigrationSteps = [
  { id: DataInputStepId.QradarRules, Component: RulesDataInput },
] as const;

export const STEP_COMPONENTS: {
  [MigrationSource.SPLUNK]: SplunkMigrationSteps;
  [MigrationSource.QRADAR]: QradarMigrationSteps;
} = {
  [MigrationSource.SPLUNK]: SPLUNK_MIGRATION_STEPS,
  [MigrationSource.QRADAR]: QRADAR_MIGRATION_STEPS,
};
