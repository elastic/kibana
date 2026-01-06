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
      return getFileEvents(esClient, options);
    case DefendInsightType.Enum.policy_response_failure:
      return getPolicyResponseFailureEvents(esClient, options);
    default:
      throw new Error(`Unsupported insight type: ${insightType}`);
  }
}
