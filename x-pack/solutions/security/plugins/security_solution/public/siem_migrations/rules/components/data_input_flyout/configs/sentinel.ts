/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Steps } from '../../../../common/types';
import { RulesDataInput } from '../steps/rules/rules_data_input';
import { WatchlistsDataInput } from '../steps/watchlists/watchlists_data_input';
import { SentinelDataInputStepId } from '../types';

export const SENTINEL_MIGRATION_STEPS: Steps = [
  { id: SentinelDataInputStepId.Rules, Component: RulesDataInput },
  { id: SentinelDataInputStepId.Watchlists, Component: WatchlistsDataInput },
] as const;
