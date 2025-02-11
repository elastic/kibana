/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import {
  getAnonymizedValue,
  transformRawData,
  DefendInsightType,
  getRawDataOrDefault,
} from '@kbn/elastic-assistant-common';

import { getFileEventsQuery } from './get_file_events_query';
import { InvalidDefendInsightTypeError } from '../errors';

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

export async function getAnonymizedEvents({
  endpointIds,
  type,
  anonymizationFields,
  esClient,
  onNewReplacements,
  replacements,
}: {
  endpointIds: string[];
  type: DefendInsightType;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> {
  const query = getQuery(type, { endpointIds });

  return getAnonymized({
    query,
    anonymizationFields,
    esClient,
    onNewReplacements,
    replacements,
  });
}

function getQuery(type: DefendInsightType, options: { endpointIds: string[] }): SearchRequest {
  if (type === DefendInsightType.Enum.incompatible_antivirus) {
    const { endpointIds } = options;
    return getFileEventsQuery({
      endpointIds,
    });
  }

  throw new InvalidDefendInsightTypeError();
}

const getAnonymized = async ({
  query,
  anonymizationFields,
  esClient,
  onNewReplacements,
  replacements,
}: {
  query: SearchRequest;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> => {
  const result = await esClient.search<{}, AggregationResponse>(query);
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

  // Accumulate replacements locally so we can, for example use the same
  // replacement for a hostname when we see it in multiple alerts:
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return fileEvents.map((fileEvent) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(fileEvent),
    })
  );
};
