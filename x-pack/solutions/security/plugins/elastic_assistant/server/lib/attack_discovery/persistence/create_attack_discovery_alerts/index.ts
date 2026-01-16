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
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { transformToAlertDocuments } from '../transforms/transform_to_alert_documents';
import { getCreatedDocumentIds } from './get_created_document_ids';
import { getCreatedAttackDiscoveryAlerts } from './get_created_attack_discovery_alerts';

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

  if (isEmpty(alertDocuments)) {
    logger.debug(
      () =>
        `No Attack discovery alerts to create for index ${attackDiscoveryAlertsIndex} in createAttackDiscoveryAlerts`
    );

    return [];
  }

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

/**
 * Data generator variant: backdate alert timestamps based on each AttackDiscovery's timestamp (when present).
 *
 * The default implementation timestamps all generated Attack Discovery alerts at "now", which is correct for
 * real attack discovery generation. The data generator wants deterministic historical timelines, so we
 * backdate `@timestamp` and `kibana.alert.start` per discovery.
 */
export const createAttackDiscoveryAlertsForDataGenerator = async ({
  adhocAttackDiscoveryDataClient,
  authenticatedUser,
  createAttackDiscoveryAlertsParams,
  logger,
  spaceId,
}: CreateAttackDiscoveryAlerts): Promise<AttackDiscoveryApiAlert[]> => {
  const attackDiscoveryAlertsIndex = adhocAttackDiscoveryDataClient.indexNameWithNamespace(spaceId);
  const readDataClient = adhocAttackDiscoveryDataClient.getReader({ namespace: spaceId });
  const writeDataClient = await adhocAttackDiscoveryDataClient.getWriter({ namespace: spaceId });

  const { attackDiscoveries, ...restParams } = createAttackDiscoveryAlertsParams;

  // Deterministic fallback for missing/invalid timestamps:
  // Use the latest valid discovery timestamp as a proxy for the generator's end-of-window time.
  const fallbackNow = (() => {
    const times = attackDiscoveries
      .map((d) =>
        typeof d.timestamp === 'string' && d.timestamp.length > 0 ? new Date(d.timestamp) : null
      )
      .filter((d): d is Date => d != null && Number.isFinite(d.getTime()))
      .map((d) => d.getTime());
    const max = times.length > 0 ? Math.max(...times) : NaN;
    return Number.isFinite(max) ? new Date(max) : new Date();
  })();

  const alertDocuments = attackDiscoveries.flatMap((attackDiscovery) => {
    const desiredNow = (() => {
      const ts = attackDiscovery.timestamp;
      if (typeof ts !== 'string' || ts.length === 0) return fallbackNow;
      const d = new Date(ts);
      return Number.isFinite(d.getTime()) ? d : fallbackNow;
    })();

    return transformToAlertDocuments({
      authenticatedUser,
      createAttackDiscoveryAlertsParams: {
        ...restParams,
        attackDiscoveries: [attackDiscovery],
      },
      now: desiredNow,
      spaceId,
    });
  });

  if (isEmpty(alertDocuments)) {
    logger.debug(
      () =>
        `No Attack discovery alerts to create for index ${attackDiscoveryAlertsIndex} in createAttackDiscoveryAlertsForDataGenerator`
    );

    return [];
  }

  const alertIds = alertDocuments.map(
    (alertDocument) => alertDocument[ALERT_UUID] ?? DEBUG_LOG_ID_PLACEHOLDER
  );

  try {
    logger.debug(
      () =>
        `Creating Attack discovery alerts (data generator) in index ${attackDiscoveryAlertsIndex} with alert ids: ${alertIds.join(
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
      `Error creating Attack discovery alerts (data generator) in index ${attackDiscoveryAlertsIndex}: ${err} with alert ids: ${alertIds.join(
        ', '
      )}`
    );

    throw err;
  }
};
