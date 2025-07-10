/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAttackDiscoveryGenerationsResponse } from '@kbn/elastic-assistant-common';

export const getMockAttackDiscoveryGenerationsResponse =
  (): GetAttackDiscoveryGenerationsResponse => ({
    generations: [
      {
        connector_id: 'claudeV3Haiku',
        discoveries: 0,
        end: '2025-06-26T21:23:04.604Z',
        loading_message:
          'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
        execution_uuid: 'f29f3d04-14da-4660-8ac1-a6c95f618a7e',
        reason:
          'Maximum hallucination failures (5) reached. Try sending fewer alerts to this model.\n',
        start: '2025-06-26T21:19:06.317Z',
        status: 'failed',
      },
      {
        alerts_context_count: 75,
        connector_id: 'gpt41Azure',
        discoveries: 2,
        end: '2025-06-26T21:20:01.248Z',
        loading_message:
          'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
        execution_uuid: 'a8e12578-d1a0-4d78-8d56-9bb7802223be',
        start: '2025-06-26T21:18:54.254Z',
        status: 'succeeded',
        connector_stats: {
          average_successful_duration_nanoseconds: 66994000000,
          successful_generations: 1,
        },
      },
      {
        connector_id: 'claudeSonnet_40',
        discoveries: 0,
        loading_message:
          'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
        execution_uuid: 'dd96c116-e8d0-4a1f-91e5-486c9fc3e455',
        start: '2025-06-26T21:18:45.182Z',
        status: 'started',
      },
    ],
  });
