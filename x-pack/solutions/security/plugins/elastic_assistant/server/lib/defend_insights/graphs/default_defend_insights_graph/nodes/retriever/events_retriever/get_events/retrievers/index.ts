/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { getFileEvents } from './file_events';
import { getPolicyResponseFailureEvents } from './policy_response_failure_events';

export interface EventRetrieverOptions {
  endpointIds: string[];
  size?: number;
  gte?: DateMath;
  lte?: DateMath;
}

export async function getEventsForInsightType(
  insightType: DefendInsightType,
  esClient: ElasticsearchClient,
  options: EventRetrieverOptions
) {
  switch (insightType) {
    case DefendInsightType.Enum.incompatible_antivirus:
      // return getFileEvents(esClient, options);
      // const fileEvents = await getFileEvents(esClient, options);
      const mockFileEvents = [
        {
          _id: ['AZkV9jJ24DzVeZElWBvc'],
          'agent.id': ['25356054-e788-467d-8100-56edb7220998'],
          'process.executable': ['/usr/bin/freshclam'],
        },
        {
          _id: ['AZkV9jJ24DzVeZFNWgsL'],
          'agent.id': ['25356054-e788-467d-8100-56edb7220998'],
          'process.executable': ['/usr/bin/clamscan'],
        },
      ];
      // return [...fileEvents, ...mockFileEvents];
      return mockFileEvents;
    case DefendInsightType.Enum.policy_response_failure:
      // return getPolicyResponseFailureEvents(esClient, options);
      // let events = await getPolicyResponseFailureEvents(esClient, options);
      const mockEvents = [
        { name: 'agent_connectivity', message: 'Failed to connect to Agent' },
        { name: 'connect_kernel', message: 'Failed to open kernel device', os: 'MacOS' },
        { name: 'connect_kernel', message: 'Failed to open kernel device' },
        {
          name: 'detect_network_events',
          message: 'Failed to start network event reporting',
          os: 'MacOS',
        },
        { name: 'full_disk_access', message: 'Full Disk Access is not enabled', os: 'MacOS' },
        {
          name: 'configure_malware',
          message: 'Disabled due to potential system deadlock. Failed to enable malware protection',
          os: 'Linux',
        },
        {
          name: 'download_user_artifacts',
          message: 'Failed to download or validate user artifacts.',
        },
      ].map((mockEvent) => ({
        _id: ['some-doc-id'],
        'agent.id': ['some-agent-id'],
        'host.os.name': [mockEvent.os ?? 'Windows'],
        'actions.name': [mockEvent.name],
        'actions.message': [mockEvent.message],
        'actions.status': ['warning'],
      }));
      // return [...events, ...mockEvents];
      return mockEvents;
    default:
      throw new Error(`Unsupported insight type: ${insightType}`);
  }
}
