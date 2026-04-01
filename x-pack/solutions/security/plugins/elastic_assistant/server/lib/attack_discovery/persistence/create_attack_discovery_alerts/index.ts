/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type {
  AttackDiscoveryApiAlert,
  CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';
import { ALERT_RULE_EXECUTION_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
} from '@kbn/attack-discovery-schedules-common';
import { transformToAlertDocuments } from '../transforms/transform_to_alert_documents';
import { getCreatedDocumentIds } from './get_created_document_ids';
import { getCreatedAttackDiscoveryAlerts } from './get_created_attack_discovery_alerts';
import { validateAlertDocuments } from './validate_alert_documents';

interface CreateAttackDiscoveryAlerts {
  adhocAttackDiscoveryDataClient: IRuleDataClient;
  authenticatedUser: AuthenticatedUser;
  createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams;
  logger: Logger;
  spaceId: string;
}

const DEBUG_LOG_ID_PLACEHOLDER = `(uuid will replace missing ${ALERT_UUID})`;

export const createAttackDiscoveryAlerts = async ({
  adhocAttackDiscoveryDataClient,
  authenticatedUser,
  createAttackDiscoveryAlertsParams,
  logger,
  spaceId,
}: CreateAttackDiscoveryAlerts): Promise<AttackDiscoveryApiAlert[]> => {
  const traceId = `[trace: ${createAttackDiscoveryAlertsParams.generationUuid}]`;
  logger.info(
    `[PERSIST] createAttackDiscoveryAlerts called with ${
      createAttackDiscoveryAlertsParams.attackDiscoveries?.length ?? 0
    } discoveries ${traceId}`
  );

  const attackDiscoveryAlertsIndex = adhocAttackDiscoveryDataClient.indexNameWithNamespace(spaceId);
  const readDataClient = adhocAttackDiscoveryDataClient.getReader({ namespace: spaceId });
  const writeDataClient = await adhocAttackDiscoveryDataClient.getWriter({ namespace: spaceId });

  const now = new Date();

  const alertDocuments = transformToAlertDocuments({
    authenticatedUser,
    createAttackDiscoveryAlertsParams,
    now,
    spaceId,
  });

  logger.info(
    `[PERSIST] transformToAlertDocuments returned ${alertDocuments.length} documents ${traceId}`
  );

  if (isEmpty(alertDocuments)) {
    logger.warn(
      `[PERSIST] No Attack discovery alerts to create for index ${attackDiscoveryAlertsIndex} - transformToAlertDocuments returned empty ${traceId}`
    );

    return [];
  }

  // Validate all documents before writing
  logger.debug(() => `Validating ${alertDocuments.length} attack discovery alert documents`);
  const validationResult = validateAlertDocuments(alertDocuments);

  if (!validationResult.isValid) {
    const validationErrors = validationResult.errors
      .map(
        (error) =>
          `Document ${error.documentId}: missing fields [${error.missingFields.join(', ')}]`
      )
      .join('\n  ');

    logger.error(
      `Validation failed for ${validationResult.errors.length} of ${alertDocuments.length} attack discovery alert documents:\n  ${validationErrors}`
    );

    throw new Error(
      `Cannot create attack discovery alerts: ${validationResult.errors.length} documents failed validation. Missing required fields. See logs for details.`
    );
  }

  logger.debug(
    () => `All ${alertDocuments.length} attack discovery alert documents passed validation`
  );

  // Log document structure for debugging
  alertDocuments.forEach((doc, index) => {
    logger.debug(
      () =>
        `Document ${index + 1}/${alertDocuments.length} structure: ` +
        `timestamp=${doc['@timestamp']}, ` +
        `execution_uuid=${doc[ALERT_RULE_EXECUTION_UUID]}, ` +
        `api_config.name=${doc[ALERT_ATTACK_DISCOVERY_API_CONFIG]?.name}, ` +
        `api_config.connector_id=${doc[ALERT_ATTACK_DISCOVERY_API_CONFIG]?.connector_id}, ` +
        `alertIds=${
          Array.isArray(doc[ALERT_ATTACK_DISCOVERY_ALERT_IDS])
            ? doc[ALERT_ATTACK_DISCOVERY_ALERT_IDS].length
            : 'not-array'
        }`
    );
  });

  const alertIds = alertDocuments.map(
    (alertDocument) => alertDocument[ALERT_UUID] ?? DEBUG_LOG_ID_PLACEHOLDER
  );

  try {
    logger.debug(
      () =>
        `Creating Attack discovery alerts in index ${attackDiscoveryAlertsIndex} with alert ids: ${alertIds.join(
          ', '
        )}`
    );

    const body = alertDocuments.flatMap((alertDocument) => [
      {
        create: {
          _id: alertDocument[ALERT_UUID] ?? uuidv4(),
        },
      },
      alertDocument,
    ]);

    const resp = await writeDataClient.bulk({
      body,
      refresh: true,
    });

    const bulkResponse = resp?.body;
    if (!bulkResponse) {
      logger.info(`Rule data client returned undefined as a result of the bulk operation.`);
      return [];
    }

    const createdDocumentIds = getCreatedDocumentIds(bulkResponse);

    if (bulkResponse.errors) {
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

    logger.debug(
      () =>
        `Created Attack discovery alerts in index ${attackDiscoveryAlertsIndex} with document ids: ${createdDocumentIds.join(
          ', '
        )}`
    );

    const { enableFieldRendering, withReplacements } = createAttackDiscoveryAlertsParams;

    return getCreatedAttackDiscoveryAlerts({
      attackDiscoveryAlertsIndex,
      createdDocumentIds,
      enableFieldRendering,
      logger,
      readDataClient,
      withReplacements,
    });
  } catch (err) {
    logger.error(
      `Error creating Attack discovery alerts in index ${attackDiscoveryAlertsIndex}: ${err} with alert ids: ${alertIds.join(
        ', '
      )}`
    );

    throw err;
  }
};
