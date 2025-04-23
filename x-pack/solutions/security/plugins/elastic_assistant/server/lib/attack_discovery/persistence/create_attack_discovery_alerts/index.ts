/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryAlert,
  CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { transformToAlertDocuments } from '../transforms/transform_to_alert_documents';
import { getCreatedDocumentIds } from './get_created_document_ids';
import { getCreatedAttackDiscoveryAlerts } from './get_created_attack_discovery_alerts';

interface CreateAttackDiscoveryAlerts {
  attackDiscoveryAlertsIndex: string;
  authenticatedUser: AuthenticatedUser;
  createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams;
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}

const DEBUG_LOG_ID_PLACEHOLDER = `(uuid will replace missing ${ALERT_UUID})`;

export const createAttackDiscoveryAlerts = async ({
  attackDiscoveryAlertsIndex,
  authenticatedUser,
  createAttackDiscoveryAlertsParams,
  esClient,
  logger,
  spaceId,
}: CreateAttackDiscoveryAlerts): Promise<AttackDiscoveryAlert[]> => {
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

    const bulkResponse = await esClient.bulk({
      body,
      index: attackDiscoveryAlertsIndex,
      refresh: true,
    });

    const createdDocumentIds = getCreatedDocumentIds(bulkResponse);

    return getCreatedAttackDiscoveryAlerts({
      attackDiscoveryAlertsIndex,
      createdDocumentIds,
      esClient,
      logger,
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
