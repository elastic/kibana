/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Steps } from '../../../../common/types';
import { LookupsDataInput } from '../steps/lookups/lookups_data_input';
import { MacrosDataInput } from '../steps/macros/macros_data_input';
import { RulesDataInput } from '../steps/rules/rules_data_input';

export enum SplunkDataInputStepId {
  Rules = 'splunk_rules',
  Macros = 'splunk_macros',
  Lookups = 'splunk_lookups',
}

export const SPLUNK_MIGRATION_STEPS: Steps = [
  { id: SplunkDataInputStepId.Rules, Component: RulesDataInput },
  { id: SplunkDataInputStepId.Macros, Component: MacrosDataInput },
  { id: SplunkDataInputStepId.Lookups, Component: LookupsDataInput },
] as const;
