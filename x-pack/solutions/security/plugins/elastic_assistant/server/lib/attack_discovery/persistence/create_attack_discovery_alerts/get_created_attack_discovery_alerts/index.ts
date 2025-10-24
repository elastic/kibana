/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import type { IRuleDataReader } from '@kbn/rule-registry-plugin/server';
import { isEmpty } from 'lodash/fp';

import type { estypes } from '@elastic/elasticsearch';
import { getIdsQuery } from './get_ids_query';
import type { AttackDiscoveryAlertDocument } from '../../../schedules/types';
import { transformSearchResponseToAlerts } from '../../transforms/transform_search_response_to_alerts';

export const getCreatedAttackDiscoveryAlerts = async ({
  attackDiscoveryAlertsIndex,
  createdDocumentIds,
  enableFieldRendering,
  logger,
  readDataClient,
  withReplacements,
}: {
  attackDiscoveryAlertsIndex: string;
  createdDocumentIds: string[];
  enableFieldRendering: boolean;
  logger: Logger;
  readDataClient: IRuleDataReader;
  withReplacements: boolean;
}): Promise<AttackDiscoveryApiAlert[]> => {
  if (isEmpty(createdDocumentIds)) {
    logger.debug(
      () =>
        `No Attack discovery alerts to query in index ${attackDiscoveryAlertsIndex} (getCreatedAttackDiscoveryAlerts)`
    );

    return [];
  }

  try {
    const idsQuery = getIdsQuery(createdDocumentIds);

    // For some reason inside the rule data client we cast the response from `estypes.SearchResponse`
    // into the ` as unknown as ESSearchResponse<TAlertDoc, TSearchRequest>`.
    // Within the attack discovery we work with the `estypes` and thus here we cast response back.
    const response = (await readDataClient.search<
      estypes.SearchRequest,
      AttackDiscoveryAlertDocument
    >({
      size: createdDocumentIds.length,
      ...idsQuery,
    })) as unknown as estypes.SearchResponse<AttackDiscoveryAlertDocument>;

    const { data } = transformSearchResponseToAlerts({
      enableFieldRendering,
      logger,
      response,
      withReplacements,
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
