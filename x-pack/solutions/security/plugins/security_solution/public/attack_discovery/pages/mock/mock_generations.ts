/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAttackDiscoveryGenerationsResponse } from '@kbn/elastic-assistant-common';

export const getMockGenerations = (): GetAttackDiscoveryGenerationsResponse => ({
  generations: [
    {
      alerts_context_count: 75,
      connector_id: 'gpt41Azure',
      discoveries: 8,
      end: '2025-05-19T22:16:23.315Z',
      loading_message:
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
      execution_uuid: '96aaee15-47c1-4150-91cd-18541b85e7cf',
      start: '2025-05-19T22:15:10.759Z',
      status: 'succeeded',
      connector_stats: {
        average_successful_duration_nanoseconds: 75516500000,
        successful_generations: 2,
      },
    },
    {
      connector_id: 'gemini_2_5_pro',
      discoveries: 0,
      end: '2025-05-19T17:34:32.191Z',
      loading_message:
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
      execution_uuid: 'bb2f5e6e-6dcd-4335-a3d2-a69ba090561d',
      reason:
        'Maximum generation attempts (10) reached. Try sending fewer alerts to this model.\ngenerate node is unable to parse (gemini) response from attempt 0; (this may be an incomplete response from the model): Response validation failed (Error: [usageMetadata.candidatesTokenCount]: expected value of type [number] but got [undefined]): ActionsClientLlm: action result status is error: an error occurred while running the action - Response validation failed (Error: [usageMetadata.candidatesTokenCount]: expected value of type [number] but got [undefined]),\ngenerate node is unable to parse (gemini) response from attempt 1; (this may be an incomplete response from the model): Response validation failed (Error: [usageMetadata.candidatesTokenCount]: expected value of type [number] but got [undefined]): ActionsClientLlm: action result status is error: an error occurred while running the action - Response validation failed (Error: [usageMetadata.candidatesTokenCount]: expected value of type [number] but got [undefined]),\ngenera',
      start: '2025-05-19T17:21:51.620Z',
      status: 'dismissed',
    },
    {
      alerts_context_count: 75,
      connector_id: 'pmeClaudeV37SonnetUsEast1',
      discoveries: 8,
      end: '2025-05-19T17:44:07.117Z',
      loading_message:
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
      execution_uuid: '22660874-7149-487a-8da5-51d876820401',
      start: '2025-05-19T17:21:40.569Z',
      status: 'dismissed',
      connector_stats: {
        average_successful_duration_nanoseconds: 1346548000000,
        successful_generations: 1,
      },
    },
  ],
});
