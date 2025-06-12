/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import {
  DefendInsightType,
  Replacements,
  getAnonymizedValue,
  getRawDataOrDefault,
  transformRawData,
} from '@kbn/elastic-assistant-common';

import { getQuery } from './queries';

interface AggregationResponse {
  unique_process_executable: {
    buckets: Array<{
      key: string;
      doc_count: number;
      latest_event: {
        hits: {
          hits: Array<{
            _id: string;
            _source: {
              agent: { id: string };
              process: { executable: string };
            };
          }>;
        };
      };
    }>;
  };
}

export const getAnonymizedEvents = async ({
  insightType,
  endpointIds,
  anonymizationFields,
  esClient,
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
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
  size?: number;
  start?: DateMath;
  end?: DateMath;
}): Promise<string[]> => {
  if (insightType == null) {
    return [];
  }

  const query = getQuery(insightType, { endpointIds, size, gte: start, lte: end });
  // TODO add support for other insight types
  const result = await esClient.search<SearchResponse, AggregationResponse>(query);
  const fileEvents = (result.aggregations?.unique_process_executable.buckets ?? []).map(
    (bucket) => {
      const latestEvent = bucket.latest_event.hits.hits[0];
      return {
        _id: [latestEvent._id],
        'agent.id': [latestEvent._source.agent.id],
        'process.executable': [latestEvent._source.process.executable],
      };
    }
  );

  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return fileEvents.map((event) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(event),
    })
  );
};
