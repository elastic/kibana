/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import {
  createV2HostRiskEnrichments,
  createHostRiskEnrichments,
} from './enrichment_by_type/host_risk';
import {
  createV2UserRiskEnrichments,
  createUserRiskEnrichments,
} from './enrichment_by_type/user_risk';
import {
  createV2ServiceRiskEnrichments,
  createServiceRiskEnrichments,
} from './enrichment_by_type/service_risk';
import {
  createV2HostAssetCriticalityEnrichments,
  createV2ServiceAssetCriticalityEnrichments,
  createV2UserAssetCriticalityEnrichments,
  createHostAssetCriticalityEnrichments,
  createUserAssetCriticalityEnrichments,
  createServiceAssetCriticalityEnrichments,
} from './enrichment_by_type/asset_criticality';
import { getAssetCriticalityIndex } from '../../../../../../common/entity_analytics/asset_criticality';
import type { EnrichEvents, EventsMapByEnrichments } from './types';
import { applyEnrichmentsToEvents } from './utils/transforms';
import { isIndexExist } from './utils/is_index_exist';
import { getRiskIndex } from '../../../../../../common/search_strategy';

export const enrichEvents: EnrichEvents = async ({
  services,
  logger,
  events,
  spaceId,
  experimentalFeatures,
  entityStoreCrudClient,
}) => {
  try {
    const enrichments: Array<Promise<EventsMapByEnrichments>> = [];
    const enrichmentOpts = { services, logger, events, spaceId, entityStoreCrudClient };

    logger.debug('Alert enrichments started');

    if (experimentalFeatures.entityAnalyticsEntityStoreV2) {
      if (entityStoreCrudClient != null) {
        // V2: read risk and asset criticality from the entity store via listEntities.
        const entityStoreIndexExists = await isIndexExist({
          services,
          index: getLatestEntitiesIndexName(spaceId),
        });

        if (entityStoreIndexExists) {
          enrichments.push(createV2HostRiskEnrichments(enrichmentOpts));
          enrichments.push(createV2UserRiskEnrichments(enrichmentOpts));
          enrichments.push(createV2ServiceRiskEnrichments(enrichmentOpts));
          enrichments.push(createV2HostAssetCriticalityEnrichments(enrichmentOpts));
          enrichments.push(createV2UserAssetCriticalityEnrichments(enrichmentOpts));
          enrichments.push(createV2ServiceAssetCriticalityEnrichments(enrichmentOpts));
        }
      } else {
        logger.warn(
          'Enrichments: entityStoreCrudClient is not available, skipping entity store enrichments'
        );
      }
    } else {
      // Legacy: read risk from the risk score index and asset criticality from the
      // asset criticality index, matched by entity name fields.
      const riskScoreIndexExists = await isIndexExist({
        services,
        index: getRiskIndex(spaceId, true),
      });

      if (riskScoreIndexExists) {
        enrichments.push(createHostRiskEnrichments(enrichmentOpts));
        enrichments.push(createUserRiskEnrichments(enrichmentOpts));
        enrichments.push(createServiceRiskEnrichments(enrichmentOpts));
      }

      const assetCriticalityIndexExists = await isIndexExist({
        services,
        index: getAssetCriticalityIndex(spaceId),
      });

      if (assetCriticalityIndexExists) {
        enrichments.push(createHostAssetCriticalityEnrichments(enrichmentOpts));
        enrichments.push(createUserAssetCriticalityEnrichments(enrichmentOpts));
        enrichments.push(createServiceAssetCriticalityEnrichments(enrichmentOpts));
      }
    }

    const allEnrichmentsResults = await Promise.allSettled(enrichments);

    const allFulfilledEnrichmentsResults: EventsMapByEnrichments[] = allEnrichmentsResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<EventsMapByEnrichments>)?.value);

    return applyEnrichmentsToEvents({
      events,
      enrichmentsList: allFulfilledEnrichmentsResults,
      logger,
    });
  } catch (error) {
    logger.error(`Enrichments failed ${error}`);
    return events;
  }
};
