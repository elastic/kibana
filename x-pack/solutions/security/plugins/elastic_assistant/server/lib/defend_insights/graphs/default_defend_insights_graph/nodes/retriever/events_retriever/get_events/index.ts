/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { DefendInsightType, Replacements } from '@kbn/elastic-assistant-common';
import {
  getAnonymizedValue,
  getRawDataOrDefault,
  transformRawData,
} from '@kbn/elastic-assistant-common';

import type { AIAssistantKnowledgeBaseDataClient } from '../../../../../../../../ai_assistant_data_clients/knowledge_base';
import { getEventsForInsightType } from './retrievers';
import { enrichEvents } from './enrichers';

export const getAnonymizedEvents = async ({
  insightType,
  endpointIds,
  anonymizationFields,
  esClient,
  kbDataClient,
  onNewReplacements,
  replacements,
  size,
  start,
  end,
}: {
  insightType: DefendInsightType;
  endpointIds: string[];
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  kbDataClient: AIAssistantKnowledgeBaseDataClient | null;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
  size?: number;
  start?: DateMath;
  end?: DateMath;
}): Promise<string[]> => {
  if (insightType == null) {
    return [];
  }

  const events = await getEventsForInsightType(insightType, esClient, {
    endpointIds,
    size,
    gte: start,
    lte: end,
  });

  const enrichedEvents = await enrichEvents(insightType, events, { kbDataClient });

  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return enrichedEvents.map((event) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(event),
    })
  );
};
