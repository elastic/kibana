/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightStatus, DefendInsightType } from '@kbn/elastic-assistant-common';

import type { EsDefendInsightSchema } from '../lib/defend_insights/persistence/types';

export const getParsedDefendInsightsMock = (timestamp: string): EsDefendInsightSchema[] => [
  {
    '@timestamp': timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    last_viewed_at: timestamp,
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
    namespace: 'default',
    id: '655c52ec-49ee-4d20-87e5-7edd6d8f84e8',
    generation_intervals: [
      {
        date: timestamp,
        duration_ms: 13113,
      },
    ],
    average_interval_ms: 13113,
    events_context_count: 100,
    replacements: [
      {
        uuid: '2009c67b-89b8-43d9-b502-2c32f71875a0',
        value: 'root',
      },
      {
        uuid: '9f7f91b6-6853-48b7-bfb8-403f5efb2364',
        value: 'joey-dev-default-3539',
      },
    ],
  },
  {
    '@timestamp': timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    last_viewed_at: timestamp,
    users: [
      {
        id: '00468e82-e37f-4224-80c1-c62e594c74b1',
        name: 'ubuntu',
      },
    ],
    status: DefendInsightStatus.Enum.succeeded,
    api_config: {
      action_type_id: '.bedrock',
      connector_id: 'bc5e19d1-e2e2-49af-bf4b-59428473101d',
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    },
    endpoint_ids: ['b557bb12-8206-44b6-b2a5-dbcce5b1e65e'],
    insight_type: DefendInsightType.Enum.incompatible_antivirus,
    insights: [
      {
        group: 'linux_security',
        events: [],
      },
    ],
    namespace: 'default',
    id: '7a1b52ec-49ee-4d20-87e5-7edd6d8f84e9',
    generation_intervals: [
      {
        date: timestamp,
        duration_ms: 13113,
      },
    ],
    average_interval_ms: 13113,
    events_context_count: 100,
    replacements: [
      {
        uuid: '3119c67b-89b8-43d9-b502-2c32f71875b1',
        value: 'ubuntu',
      },
      {
        uuid: '8e7f91b6-6853-48b7-bfb8-403f5efb2365',
        value: 'ubuntu-dev-default-3540',
      },
    ],
  },
];

export const getRawDefendInsightsMock = (timestamp: string) =>
  JSON.stringify(getParsedDefendInsightsMock(timestamp));
