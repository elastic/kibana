/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SplunkDataInputStepId } from '../components/data_input_flyout/steps/constants';
import { LookupsDataInput } from '../components/data_input_flyout/steps/lookups/lookups_data_input';
import { MacrosDataInput } from '../components/data_input_flyout/steps/macros/macros_data_input';
import { RulesDataInput } from '../components/data_input_flyout/steps/rules/rules_data_input';
import type { SplunkMigrationSteps } from '../components/data_input_flyout/types';

export const SPLUNK_MIGRATION_STEPS: SplunkMigrationSteps = [
  { id: SplunkDataInputStepId.Rules, Component: RulesDataInput },
  { id: SplunkDataInputStepId.Macros, Component: MacrosDataInput },
  { id: SplunkDataInputStepId.Lookups, Component: LookupsDataInput },
] as const;
