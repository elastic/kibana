/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ASSISTANT_NAMESPACE } from '@kbn/elastic-assistant';
import { TRACE_OPTIONS_SESSION_STORAGE_KEY } from '@kbn/elastic-assistant/impl/assistant_context/constants';

export const TASK_STATS_POLLING_SLEEP_SECONDS = 10 as const;
export const START_STOP_POLLING_SLEEP_SECONDS = 1 as const;
export const CREATE_MIGRATION_BODY_BATCH_SIZE = 50 as const;

// use the default assistant namespace since it's the only one we use
export const NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY =
  `${DEFAULT_ASSISTANT_NAMESPACE}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}` as const;

export const SIEM_MIGRATION_PREFIX = 'siem_migrations' as const;
