/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import type { AIAssistantKnowledgeBaseDataClient } from '../../../../../../../../../ai_assistant_data_clients/knowledge_base';
import type { getEventsForInsightType } from '../retrievers';
import { enrichPolicyResponseFailureEvents } from './policy_response_failure';

export function enrichEvents(
  insightType: DefendInsightType,
  events: Awaited<ReturnType<typeof getEventsForInsightType>>,
  params: { kbDataClient: AIAssistantKnowledgeBaseDataClient | null }
): Promise<typeof events> | ReturnType<typeof enrichPolicyResponseFailureEvents> {
  switch (insightType) {
    case DefendInsightType.Enum.policy_response_failure:
      return enrichPolicyResponseFailureEvents(
        events as {
          _id: string[];
          'agent.id': string[];
          'host.os.name': string[];
          'actions.name': string[];
          'actions.message': string[];
          'actions.status': string[];
        }[],
        params.kbDataClient
      );
    default:
      return Promise.resolve(events);
  }
}
