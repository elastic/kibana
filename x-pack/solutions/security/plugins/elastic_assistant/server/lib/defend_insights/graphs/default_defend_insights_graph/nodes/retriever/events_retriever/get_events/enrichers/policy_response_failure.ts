/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import type { AIAssistantKnowledgeBaseDataClient } from '../../../../../../../../../ai_assistant_data_clients/knowledge_base';
import { DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE } from '../../../../../../../../../routes/knowledge_base/constants';

const splitKey = ':::';

function getUniqueEventKey(
  event: {
    _id: string[];
    'agent.id': string[];
    'host.os.name': string[];
    'actions.name': string[];
    'actions.message': string[];
    'actions.status': string[];
  },
  index: number
): string {
  // example "configure_malware:::Disabled due to potential system deadlock. Failed to enable malware protection:::Linux"
  return `${event['actions.name'][index]}${splitKey}${event['actions.message'][index]}${splitKey}${event['host.os.name'][0]}`;
}

function getUniqueEventKeys(
  events: {
    _id: string[];
    'agent.id': string[];
    'host.os.name': string[];
    'actions.name': string[];
    'actions.message': string[];
    'actions.status': string[];
  }[]
): string[] {
  return events.flatMap((event) =>
    event['actions.name'].map((_, i) => getUniqueEventKey(event, i))
  );
}

export async function enrichPolicyResponseFailureEvents(
  events: {
    _id: string[];
    'agent.id': string[];
    'host.os.name': string[];
    'actions.name': string[];
    'actions.message': string[];
    'actions.status': string[];
  }[],
  kbDataClient: AIAssistantKnowledgeBaseDataClient | null
): Promise<
  {
    _id: string[];
    'agent.id': string[];
    'host.os.name': string[];
    'actions.name': string[];
    'actions.message': string[];
    'actions.status': string[];
    'actions.context'?: string[];
  }[]
> {
  if (!kbDataClient) {
    return events;
  }

  const uniqueEventKeys = getUniqueEventKeys(events);
  const messageToKBMap: Record<string, string> = {};

  await pMap(
    uniqueEventKeys,
    async (eventKey) => {
      const [name, message, os] = eventKey.split(splitKey);
      const kbContext = await kbDataClient.getKnowledgeBaseDocumentEntries({
        query: `How to fix action.name:${name} action.message:${message} on ${os}?`,
        kbResource: DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE,
        filter: {
          bool: {
            must: [
              {
                match_phrase: {
                  text: name,
                },
              },
              {
                match: {
                  text: message,
                },
              },
              {
                match_phrase: {
                  text: os,
                },
              },
            ],
          },
        },
      });
      messageToKBMap[eventKey] = kbContext.map((entry) => entry.pageContent).join('\n===\n');
    },
    { concurrency: 10 }
  );

  return events.map((event) => ({
    ...event,
    'actions.context': event['actions.message'].map(
      (_, i) => messageToKBMap[getUniqueEventKey(event, i)] ?? ''
    ),
  }));
}
