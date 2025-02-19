/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Expand } from '../../../../common/utils/objects/types';
import type {
  EngineStatus,
  InitEntityEngineRequestBody,
  StoreStatus,
} from '../../../../common/api/entity_analytics';
import { DEFAULT_INTERVAL } from './tasks/field_retention_enrichment/constants';

export const DEFAULT_LOOKBACK_PERIOD = '24h';
export const DEFAULT_FIELD_HISTORY_LENGTH = 10;
export const DEFAULT_SYNC_DELAY = '1m';
export const DEFAULT_TIMEOUT = '180s';
export const DEFAULT_FREQUENCY = '1m';
export const DEFAULT_DOCS_PER_SECOND = undefined;
export const DEFAULT_INDEX_PATTERNS = '';
export const DEFAULT_KQL_FILTER = '';
export const DEFAULT_TIMESTAMP_FIELD = '@timestamp';

export const defaultOptions: Expand<
  Required<Omit<InitEntityEngineRequestBody, 'docsPerSecond'>> & {
    docsPerSecond: number | undefined;
  }
> = {
  delay: DEFAULT_SYNC_DELAY,
  timeout: DEFAULT_TIMEOUT,
  frequency: DEFAULT_FREQUENCY,
  docsPerSecond: DEFAULT_DOCS_PER_SECOND,
  lookbackPeriod: DEFAULT_LOOKBACK_PERIOD,
  fieldHistoryLength: DEFAULT_FIELD_HISTORY_LENGTH,
  indexPattern: DEFAULT_INDEX_PATTERNS,
  filter: DEFAULT_KQL_FILTER,
  enrichPolicyExecutionInterval: DEFAULT_INTERVAL,
  timestampField: DEFAULT_TIMESTAMP_FIELD,
};

export const ENGINE_STATUS: Record<Uppercase<EngineStatus>, EngineStatus> = {
  INSTALLING: 'installing',
  STARTED: 'started',
  STOPPED: 'stopped',
  UPDATING: 'updating',
  ERROR: 'error',
};

export const ENTITY_STORE_STATUS: Record<Uppercase<StoreStatus>, StoreStatus> = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  INSTALLING: 'installing',
  NOT_INSTALLED: 'not_installed',
  ERROR: 'error',
};

export const MAX_SEARCH_RESPONSE_SIZE = 10_000;
