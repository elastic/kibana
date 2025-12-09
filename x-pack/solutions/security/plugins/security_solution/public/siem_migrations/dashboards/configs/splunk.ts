/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SplunkDashboardDataInputStepId } from '../components/data_input_flyout/steps/constants';
import { LookupsDataInput } from '../components/data_input_flyout/steps/lookups/lookups_data_input';
import { MacrosDataInput } from '../components/data_input_flyout/steps/macros/macros_data_input';
import { DashboardsUploadStep } from '../components/data_input_flyout/steps/upload_dashboards';
import type { Steps } from '../types';

export const SPLUNK_MIGRATION_STEPS: Steps = [
  { id: SplunkDashboardDataInputStepId.Rules, Component: DashboardsUploadStep },
  { id: SplunkDashboardDataInputStepId.Macros, Component: MacrosDataInput },
  { id: SplunkDashboardDataInputStepId.Lookups, Component: LookupsDataInput },
] as const;
