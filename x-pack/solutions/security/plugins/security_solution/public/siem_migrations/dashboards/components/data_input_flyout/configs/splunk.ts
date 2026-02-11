/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Steps } from '../../../../common/types';
import { SplunkDashboardDataInputStepId } from '../steps/constants';
import { LookupsDataInput } from '../steps/lookups/lookups_data_input';
import { MacrosDataInput } from '../steps/macros/macros_data_input';
import { DashboardsUploadStep } from '../steps/upload_dashboards';

export const SPLUNK_MIGRATION_STEPS: Steps = [
  { id: SplunkDashboardDataInputStepId.Rules, Component: DashboardsUploadStep },
  { id: SplunkDashboardDataInputStepId.Macros, Component: MacrosDataInput },
  { id: SplunkDashboardDataInputStepId.Lookups, Component: LookupsDataInput },
] as const;
