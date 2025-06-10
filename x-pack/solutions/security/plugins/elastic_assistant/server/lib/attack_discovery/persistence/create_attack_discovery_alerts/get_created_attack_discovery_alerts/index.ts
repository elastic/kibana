/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { isEmpty } from 'lodash/fp';

import { getIdsQuery } from './get_ids_query';
import { AttackDiscoveryAlertDocument } from '../../../schedules/types';
import { transformSearchResponseToAlerts } from '../../transforms/transform_search_response_to_alerts';

export const getCreatedAttackDiscoveryAlerts = async ({
  attackDiscoveryAlertsIndex,
  createdDocumentIds,
  esClient,
  logger,
}: {
  attackDiscoveryAlertsIndex: string;
  createdDocumentIds: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<AttackDiscoveryAlert[]> => {
  if (isEmpty(createdDocumentIds)) {
    logger.debug(
      () =>
        `No Attack discovery alerts to query in index ${attackDiscoveryAlertsIndex} (getCreatedAttackDiscoveryAlerts)`
    );

    return [];
  }

  try {
    const idsQuery = getIdsQuery(createdDocumentIds);

    const response = await esClient.search<AttackDiscoveryAlertDocument>({
      index: attackDiscoveryAlertsIndex,
      size: createdDocumentIds.length,
      ...idsQuery,
    });

    const { data } = transformSearchResponseToAlerts({
      logger,
      response,
    });

    return data;
  } catch (err) {
    logger.error(
      `Error getting created Attack discovery alerts in index ${attackDiscoveryAlertsIndex}: ${err} with alert ids: ${createdDocumentIds.join(
        ', '
      )}`
    );

    throw err;
  }
};
