/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { DefendInsightStatus, DefendInsightType } from '@kbn/elastic-assistant-common';

import type { EsDefendInsightSchema } from '../ai_assistant_data_clients/defend_insights/types';

export const getDefendInsightsSearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsDefendInsightSchema> = {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 1,
      hits: [
        {
          _index: '.kibana-elastic-ai-assistant-defend-insights-default',
          _id: '655c52ec-49ee-4d20-87e5-7edd6d8f84e8',
          _score: 1,
          _source: {
            '@timestamp': '2024-09-24T10:48:46.847Z',
            created_at: '2024-09-24T10:48:46.847Z',
            users: [
              {
                id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                name: 'elastic',
              },
            ],
            status: DefendInsightStatus.Enum.succeeded,
            api_config: {
              action_type_id: '.bedrock',
              connector_id: 'ac4e19d1-e2e2-49af-bf4b-59428473101c',
              model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
            },
            endpoint_ids: ['6e09ec1c-644c-4148-a02d-be451c35400d'],
            insight_type: DefendInsightType.Enum.incompatible_antivirus,
            insights: [
              {
                group: 'windows_defenders',
                events: [],
              },
            ],
            updated_at: '2024-09-24T10:48:59.952Z',
            last_viewed_at: '2024-09-24T10:49:53.522Z',
            namespace: 'default',
            id: '655c52ec-49ee-4d20-87e5-7edd6d8f84e8',
            generation_intervals: [
              {
                date: '2024-09-24T10:48:59.952Z',
                duration_ms: 13113,
              },
            ],
            average_interval_ms: 13113,
            replacements: [
              {
                uuid: '2009c67b-89b8-43d9-b502-2c32f71875a0',
                value: 'root',
              },
              {
                uuid: '9f7f91b6-6853-48b7-bfb8-403f5efb2364',
                value: 'joey-dev-default-3539',
              },
              {
                uuid: 'c08e4851-7234-408a-8083-7fd5740e4255',
                value: 'syslog',
              },
              {
                uuid: '826c58bd-1466-42fd-af1f-9094c155811b',
                value: 'messagebus',
              },
              {
                uuid: '1f8e3668-c7d7-4fdb-8195-3f337dfe10bf',
                value: 'polkitd',
              },
              {
                uuid: 'e101d201-c675-47f3-b488-77bd0ce71920',
                value: 'systemd-network',
              },
              {
                uuid: '0144102f-d69c-43a3-bf3b-04bde7d1b4e8',
                value: 'systemd-resolve',
              },
              {
                uuid: '00c5a919-949e-4031-956e-3eeb071e9210',
                value: 'systemd-timesync',
              },
            ],
            events_context_count: 100,
          },
        },
      ],
    },
  };
  return searchResponse;
};
