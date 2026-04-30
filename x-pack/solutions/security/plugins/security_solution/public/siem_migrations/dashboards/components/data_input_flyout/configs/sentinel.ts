/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Steps } from '../../../../common/types';
import { SentinelDashboardDataInputStepId } from '../steps/constants';
import { SentinelWorkbooksUploadStep } from '../steps/upload_workbooks';
import { WatchlistsDataInput } from '../steps/watchlists/watchlists_data_input';

export const SENTINEL_MIGRATION_STEPS: Steps = [
  { id: SentinelDashboardDataInputStepId.Workbooks, Component: SentinelWorkbooksUploadStep },
  { id: SentinelDashboardDataInputStepId.Watchlists, Component: WatchlistsDataInput },
] as const;
