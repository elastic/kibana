/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { PostValidateRequestBody, PostValidateResponse } from '@kbn/discoveries-schemas';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import {
  getCreatedDocumentIds,
  getVersionConflictDocumentIds,
  hasNonIdempotentBulkErrors,
} from './bulk_response_helpers';
import { getIdsQuery } from './get_ids_query';
import { transformToAlertDocuments } from './transform_to_alert_documents';
import { transformSearchResponseToAlerts } from './transform_search_response_to_alerts';

/**
 * Helper function to validate attack discoveries by persisting them as alerts.
 * This replicates the logic from elastic_assistant's dataClient.createAttackDiscoveryAlerts()
 * but is implemented as a standalone function that can be used by the validation workflow step.
 */
export const validateAttackDiscoveries = async ({
  adhocAttackDiscoveryDataClient,
  authenticatedUser,
  logger,
  spaceId,
  validateRequestBody,
}: {
  adhocAttackDiscoveryDataClient: IRuleDataClient;
  authenticatedUser: AuthenticatedUser;
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

  const desiredDocumentIds = Array.from(
    new Set(
      alertDocuments.flatMap((d) => (typeof d[ALERT_UUID] === 'string' ? [d[ALERT_UUID]] : []))
    )
  );

  try {
    logger.debug(
      () =>
        `Creating Attack discovery alerts in index ${attackDiscoveryAlertsIndex} with alert ids: ${alertIds.join(
          ', '
        )}`
    );

    // Step 2: Pre-deduplicate by finding which documents already exist (idempotency).
    // This matches the intent of the elastic_assistant generation flow, which de-duplicates
    // discoveries before attempting to create alert documents.
    const existingIds = new Set<string>();
    if (!isEmpty(desiredDocumentIds)) {
      const existingResponse = await readDataClient.search({
        size: desiredDocumentIds.length,
        ...getIdsQuery(desiredDocumentIds),
      });

      existingResponse.hits.hits.forEach((hit) => {
        if (hit._id != null) {
          existingIds.add(hit._id);
        }
      });
    }

    const duplicatesDroppedCount = existingIds.size;
    const documentsToCreate = alertDocuments.filter((doc) => {
      const id = doc[ALERT_UUID];
      return typeof id === 'string' ? !existingIds.has(id) : true;
    });

    // Step 3: Bulk insert only documents that don't exist yet
    let bulkResponse: BulkResponse | undefined;
    if (!isEmpty(documentsToCreate)) {
      const body = documentsToCreate.flatMap((alertDocument) => [
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

      bulkResponse = resp?.body;

      if (!bulkResponse) {
        logger.info(`Rule data client returned undefined as a result of the bulk operation.`);
        return {
          duplicates_dropped_count: duplicatesDroppedCount,
          validated_discoveries: [],
        };
      }
    }

    const createdDocumentIds = bulkResponse ? getCreatedDocumentIds(bulkResponse) : [];
    const versionConflictDocumentIds = bulkResponse
      ? getVersionConflictDocumentIds(bulkResponse)
      : [];

    // Step 4: Check for errors (ignore version conflicts for idempotency)
    if (bulkResponse && bulkResponse.errors && hasNonIdempotentBulkErrors(bulkResponse)) {
      const errorDetails = bulkResponse.items.flatMap((item) => {
        const error = item.create?.error;

        if (error == null) {
          return [];
        }

        const id = item.create?._id != null ? ` id: ${item.create._id}` : '';
        const details = `\nError bulk inserting attack discovery alert${id} ${error.reason}`;
        return [details];
      });

      const allErrorDetails = errorDetails.join(', ');
      throw new Error(`Failed to bulk insert Attack discovery alerts ${allErrorDetails}`);
    }

    const idsToFetch = Array.from(
      new Set([...existingIds, ...createdDocumentIds, ...versionConflictDocumentIds])
    );

    logger.debug(
      () =>
        `Returning Attack discovery alerts from index ${attackDiscoveryAlertsIndex} with document ids: ${idsToFetch.join(
          ', '
        )}`
    );

    // Step 5: Query back the existing + created documents
    if (isEmpty(idsToFetch)) {
      logger.debug(
        () =>
          `No Attack discovery alerts to query in index ${attackDiscoveryAlertsIndex} (validateAttackDiscoveries)`
      );
      return {
        duplicates_dropped_count: duplicatesDroppedCount,
        validated_discoveries: [],
      };
    }

    const response = await readDataClient.search({
      size: idsToFetch.length,
      ...getIdsQuery(idsToFetch),
    });

    // Step 6: Transform results back to API format
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
