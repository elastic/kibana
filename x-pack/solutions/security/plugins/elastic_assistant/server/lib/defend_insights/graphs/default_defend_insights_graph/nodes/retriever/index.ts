/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DefendInsightType } from '@kbn/elastic-assistant-common';
import { Replacements } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import type { GraphState } from '../../types';
import { AnonymizedEventsRetriever } from './anonymized_events_retriever';

export const getRetrieveAnonymizedEventsNode = ({
  insightType,
  endpointIds,
  anonymizationFields,
  esClient,
  logger,
  onNewReplacements,
  replacements,
  size,
}: {
  insightType: DefendInsightType;
  endpointIds: string[];
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  logger?: Logger;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
  size?: number;
}): ((state: GraphState) => Promise<GraphState>) => {
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  const retrieveAnonymizedEvents = async (state: GraphState): Promise<GraphState> => {
    logger?.debug(() => '---RETRIEVE ANONYMIZED EVENTS---');

    const { start, end } = state;

    const retriever = new AnonymizedEventsRetriever({
      insightType,
      endpointIds,
      anonymizationFields,
      esClient,
      onNewReplacements: localOnNewReplacements,
      replacements,
      size,
      start,
      end,
    });

    const documents = await retriever
      .withConfig({ runName: 'runAnonymizedEventsRetriever' })
      .invoke('');

    return {
      ...state,
      anonymizedEvents: documents,
      replacements: localReplacements,
    };
  };

  return retrieveAnonymizedEvents;
};
