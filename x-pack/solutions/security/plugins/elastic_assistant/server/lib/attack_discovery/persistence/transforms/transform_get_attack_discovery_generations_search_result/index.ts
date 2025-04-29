/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { GetAttackDiscoveryGenerationsResponse } from '@kbn/elastic-assistant-common';

import { GetAttackDiscoveryGenerationsSearchResult } from '../../get_attack_discovery_generations_search_result';
import { getGenerationStatusOrThrow } from './get_generation_status_or_throw';

export const transformGetAttackDiscoveryGenerationsSearchResult = ({
  logger,
  rawResponse,
}: {
  rawResponse: {
    aggregations: AggregationsAggregate | undefined;
  };
  logger: Logger;
}): GetAttackDiscoveryGenerationsResponse => {
  try {
    // validate the raw response:
    const parsed = GetAttackDiscoveryGenerationsSearchResult.parse(rawResponse);

    // generate the response, skipping any generations that are missing required fields
    const generations = parsed.aggregations.generations.buckets.flatMap((bucket) => {
      const executionUuid: string | undefined = bucket.key;

      try {
        if (executionUuid == null) {
          throw new Error(
            `Execution UUID (kibana.alert.rule.execution.uuid) is missing for bucket ${JSON.stringify(
              bucket
            )}`
          );
        }

        const alertsContextCount = bucket.alerts_context_count.value ?? undefined;
        const connectorId: string | undefined = bucket.connector_id.buckets[0]?.key;
        const discoveries = bucket.discoveries.value ?? 0;
        const eventActions: string[] = bucket.event_actions.buckets.map((action) => action.key);
        const eventReason: string | undefined = bucket.event_reason.buckets[0]?.key;
        const generationEndTime = bucket.generation_end_time?.value_as_string ?? undefined;
        const generationStartTime = bucket.generation_start_time?.value_as_string;
        const loadingMessage: string | undefined = bucket.loading_message.buckets[0]?.key;
        const status = getGenerationStatusOrThrow({ eventActions, executionUuid });

        if (connectorId == null) {
          throw new Error(
            `Connector ID (event.dataset) is missing for executionUuid ${executionUuid}`
          );
        }

        if (generationStartTime == null) {
          throw new Error(
            `Generation start (event.start) time is missing for executionUuid ${executionUuid}`
          );
        }

        if (loadingMessage == null) {
          throw new Error(
            `Loading message (kibana.alert.rule.execution.status) is missing for executionUuid ${executionUuid}`
          );
        }

        return {
          alerts_context_count: alertsContextCount,
          connector_id: connectorId,
          discoveries,
          end: generationEndTime,
          loading_message: loadingMessage,
          execution_uuid: executionUuid,
          generation_start_time: generationStartTime,
          reason: eventReason,
          start: generationStartTime,
          status,
        };
      } catch (e) {
        logger.debug(
          () =>
            `Skipping Attack discovery generation search result for execution ${
              executionUuid != null ? executionUuid : 'unknown executionUuid'
            }: ${e.message}`
        );
        return [];
      }
    });

    return {
      generations,
    };
  } catch (e) {
    const errorMessage = `Failed to parse search results in transformGetAttackDiscoveryGenerationsSearchResult ${JSON.stringify(
      e.errors,
      null,
      2
    )}`;

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
};
