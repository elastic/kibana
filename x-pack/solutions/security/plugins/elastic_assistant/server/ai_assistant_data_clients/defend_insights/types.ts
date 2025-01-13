/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefendInsightStatus,
  DefendInsightType,
  Provider,
  UUID,
} from '@kbn/elastic-assistant-common';

import type { EsReplacementSchema } from '../conversations/types';

interface DefendInsightInsightEventSchema {
  id: string;
  endpoint_id: string;
  value: string;
}

interface DefendInsightInsightSchema {
  group: string;
  events?: DefendInsightInsightEventSchema[];
}

interface BaseDefendInsightSchema {
  '@timestamp': string;
  created_at: string;
  updated_at: string;
  last_viewed_at: string;
  status: DefendInsightStatus;
  events_context_count?: number;
  endpoint_ids: string[];
  insight_type: DefendInsightType;
  insights: DefendInsightInsightSchema[];
  api_config: {
    connector_id: string;
    action_type_id: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  replacements?: EsReplacementSchema[];
}

export interface EsDefendInsightSchema extends BaseDefendInsightSchema {
  id: string;
  namespace: string;
  failure_reason?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  average_interval_ms?: number;
  generation_intervals?: Array<{ date: string; duration_ms: number }>;
}

export interface CreateDefendInsightSchema extends BaseDefendInsightSchema {
  id?: string | undefined;
  users: Array<{
    id?: string;
    name?: string;
  }>;
  namespace: string;
}

export interface UpdateDefendInsightSchema {
  id: UUID;
  '@timestamp'?: string;
  updated_at?: string;
  last_viewed_at?: string;
  status?: DefendInsightStatus;
  events_context_count?: number;
  insights?: DefendInsightInsightSchema[];
  api_config?: {
    action_type_id?: string;
    connector_id?: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  replacements?: EsReplacementSchema[];
  average_interval_ms?: number;
  generation_intervals?: Array<{ date: string; duration_ms: number }>;
  failure_reason?: string;
}
