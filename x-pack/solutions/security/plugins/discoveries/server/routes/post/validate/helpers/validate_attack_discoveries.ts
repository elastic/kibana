/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { PostValidateRequestBody, PostValidateResponse } from '@kbn/discoveries-schemas';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import {
  backfillAttackIdsBestEffort,
  buildAlertIdToAttackIdsMap,
} from '@kbn/attack-discovery-schedules-common';
import { isEmpty } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import {
  getCreatedDocumentIds,
  getVersionConflictDocumentIds,
  hasNonIdempotentBulkErrors,
} from './bulk_response_helpers';
import { extractCreatedAttacks } from './extract_created_attacks';
import { getIdsQuery } from './get_ids_query';
import { transformToAlertDocuments } from './transform_to_alert_documents';
import { transformSearchResponseToAlerts } from './transform_search_response_to_alerts';

/**
 * Helper function to validate attack discoveries by persisting them as alerts.
 *
 * Discoveries are written with bulk `create` semantics, keyed by a hash of the
 * discovery's alert-id set (see `generateAttackDiscoveryAlertHash`). Because
 * `create` fails with a version conflict when a document already exists,
 * pre-existing discoveries are never overwritten: they are dropped from the
 * write (hard de-duplication) and excluded from the returned set. Only the
 * genuinely-new discoveries created this run are queried back and returned, and
 * `duplicates_dropped_count` reflects the number actually dropped.
 */
export const validateAttackDiscoveries = async ({
  adhocAttackDiscoveryDataClient,
  authenticatedUser,
  esClient,
  logger,
  spaceId,
  validateRequestBody,
}: {
  adhocAttackDiscoveryDataClient: IRuleDataClient;
  authenticatedUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  validateRequestBody: PostValidateRequestBody;
}): Promise<PostValidateResponse> => {
  const attackDiscoveryAlertsIndex = adhocAttackDiscoveryDataClient.indexNameWithNamespace(spaceId);
  const readDataClient = adhocAttackDiscoveryDataClient.getReader({ namespace: spaceId });
  const writeDataClient = await adhocAttackDiscoveryDataClient.getWriter({ namespace: spaceId });

  const now = new Date();

  // Step 1: Transform request body to Elasticsearch alert documents
  const alertDocuments = transformToAlertDocuments({
    authenticatedUser,
    now,
    spaceId,
    validateRequestBody,
  });

  if (isEmpty(alertDocuments)) {
    logger.debug(
      () =>
        `No Attack discovery alerts to create for index ${attackDiscoveryAlertsIndex} in validateAttackDiscoveries`
    );
    return {
      duplicates_dropped_count: 0,
      validated_discoveries: [],
    };
  }

  const alertIds = alertDocuments.map(
    (alertDocument) => (alertDocument[ALERT_UUID] as string) ?? '(uuid will be generated)'
  );

  try {
    logger.debug(
      () =>
        `Creating Attack discovery alerts in index ${attackDiscoveryAlertsIndex} with alert ids: ${alertIds.join(
          ', '
        )}`
    );

    // Step 2: Bulk CREATE every candidate. `create` fails with a version
    // conflict (409) for any `_id` that already exists, so pre-existing
    // discoveries are never overwritten — they are dropped (hard de-duplication).
    const body = alertDocuments.flatMap((alertDocument) => [
      {
        create: {
          _id: (alertDocument[ALERT_UUID] as string) ?? uuidv4(),
        },
      },
      alertDocument,
    ]);

    const resp = await writeDataClient.bulk({
      body,
      refresh: true,
    });

    const bulkResponse: BulkResponse | undefined = resp?.body;

    if (!bulkResponse) {
      logger.info(`Rule data client returned undefined as a result of the bulk operation.`);
      return {
        duplicates_dropped_count: 0,
        validated_discoveries: [],
      };
    }

    // Step 3: Throw only on NON-idempotent errors. Version conflicts are the
    // expected signal that a discovery already exists and was dropped.
    if (bulkResponse.errors && hasNonIdempotentBulkErrors(bulkResponse)) {
      const errorDetails = bulkResponse.items.flatMap((item) => {
        const error = item.create?.error;

        if (error == null || error.type === 'version_conflict_engine_exception') {
          return [];
        }

        const id = item.create?._id != null ? ` id: ${item.create._id}` : '';
        const details = `\nError bulk creating attack discovery alert${id} ${error.reason}`;
        return [details];
      });

      const allErrorDetails = errorDetails.join(', ');
      throw new Error(`Failed to bulk create Attack discovery alerts ${allErrorDetails}`);
    }

    // The documents actually written this run (result === 'created'), and the
    // count dropped because they already existed (version conflicts). Pre-existing
    // discoveries are never overwritten, so the dropped count reflects discoveries
    // actually skipped from writes.
    const createdDocumentIds = getCreatedDocumentIds(bulkResponse);
    const duplicatesDroppedCount = getVersionConflictDocumentIds(bulkResponse).length;

    logger.debug(
      () =>
        `Returning newly-created Attack discovery alerts from index ${attackDiscoveryAlertsIndex} with document ids: ${createdDocumentIds.join(
          ', '
        )}`
    );

    // Step 4: Query back ONLY the net-new documents. Pre-existing duplicates are
    // never re-fetched or surfaced.
    if (isEmpty(createdDocumentIds)) {
      logger.debug(
        () =>
          `No new Attack discovery alerts to query in index ${attackDiscoveryAlertsIndex} (validateAttackDiscoveries)`
      );
      return {
        duplicates_dropped_count: duplicatesDroppedCount,
        validated_discoveries: [],
      };
    }

    // Back-fill the underlying detection alerts with the ids of the attacks
    // created this run, so the Attacks page can group them under the ad-hoc
    // attack (mirrors the scheduled and legacy persistence paths). Best-effort:
    // a back-fill failure must not fail an otherwise-successful generation.
    await backfillAttackIdsBestEffort({
      alertIdToAttackIdsMap: buildAlertIdToAttackIdsMap({
        attacks: extractCreatedAttacks({ alertDocuments, createdDocumentIds }),
      }),
      esClient,
      logger,
      spaceId,
    });

    const response = await readDataClient.search({
      size: createdDocumentIds.length,
      ...getIdsQuery(createdDocumentIds),
    });

    // Step 5: Transform results back to API format
    const { enableFieldRendering, withReplacements } = {
      enableFieldRendering: validateRequestBody.enable_field_rendering ?? true,
      withReplacements: validateRequestBody.with_replacements ?? false,
    };

    const validatedDiscoveries = transformSearchResponseToAlerts({
      enableFieldRendering,
      logger,
      response: response as unknown as estypes.SearchResponse<Record<string, unknown>>,
      withReplacements,
    });

    logger.info(
      `Successfully validated ${validatedDiscoveries.length} attack discoveries to index ${attackDiscoveryAlertsIndex}`
    );

    return {
      duplicates_dropped_count: duplicatesDroppedCount,
      validated_discoveries: validatedDiscoveries,
    };
  } catch (err) {
    logger.error(
      `Error creating Attack discovery alerts in index ${attackDiscoveryAlertsIndex}: ${err} with alert ids: ${alertIds.join(
        ', '
      )}`
    );

    throw err;
  }
};
