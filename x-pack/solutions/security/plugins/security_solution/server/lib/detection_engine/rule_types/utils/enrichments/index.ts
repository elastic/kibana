/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type { DetectionAlertLatest } from '../../../../../../common/api/detection_engine/model/alerts';
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
import type {
  EnrichEvents,
  EnrichEventsParams,
  EnrichmentOptions,
  EventsForEnrichment,
  EventsMapByEnrichments,
} from './types';
import { applyEnrichmentsToEvents } from './utils/transforms';
import { isIndexExist } from './utils/is_index_exist';
import { getRiskIndex } from '../../../../../../common/search_strategy';

const resolveV2Enrichments = async <T extends DetectionAlertLatest>(
  opts: EnrichmentOptions<T>
): Promise<Array<Promise<EventsMapByEnrichments>>> => {
  const { services, spaceId, logger, entityStoreCrudClient } = opts;

  if (entityStoreCrudClient === undefined) {
    logger.warn(
      'Enrichments: entityStoreCrudClient is not available, skipping entity store enrichments'
    );
    return [];
  }

  const entityStoreIndexExists = await isIndexExist({
    services,
    index: getLatestEntitiesIndexName(spaceId),
  });

  if (!entityStoreIndexExists) {
    return [];
  }

  return [
    createV2HostRiskEnrichments(opts),
    createV2UserRiskEnrichments(opts),
    createV2ServiceRiskEnrichments(opts),
    createV2HostAssetCriticalityEnrichments(opts),
    createV2UserAssetCriticalityEnrichments(opts),
    createV2ServiceAssetCriticalityEnrichments(opts),
  ];
};

const resolveLegacyEnrichments = async <T extends DetectionAlertLatest>(
  opts: EnrichmentOptions<T>
): Promise<Array<Promise<EventsMapByEnrichments>>> => {
  const { services, spaceId } = opts;

  const [riskScoreResult, assetCriticalityResult] = await Promise.allSettled([
    isIndexExist({ services, index: getRiskIndex(spaceId, true) }),
    isIndexExist({ services, index: getAssetCriticalityIndex(spaceId) }),
  ]);

  const enrichments: Array<Promise<EventsMapByEnrichments>> = [];

  if (riskScoreResult.status === 'fulfilled' && riskScoreResult.value) {
    enrichments.push(
      createHostRiskEnrichments(opts),
      createUserRiskEnrichments(opts),
      createServiceRiskEnrichments(opts)
    );
  }

  if (assetCriticalityResult.status === 'fulfilled' && assetCriticalityResult.value) {
    enrichments.push(
      createHostAssetCriticalityEnrichments(opts),
      createUserAssetCriticalityEnrichments(opts),
      createServiceAssetCriticalityEnrichments(opts)
    );
  }

  return enrichments;
};

export const enrichEvents: EnrichEvents = async <T extends DetectionAlertLatest>({
  services,
  logger,
  events,
  spaceId,
  experimentalFeatures,
  entityStoreCrudClient,
}: EnrichEventsParams<T>): Promise<Array<EventsForEnrichment<T>>> => {
  try {
    logger.debug('Alert enrichments started');

    const enrichmentOpts: EnrichmentOptions<T> = {
      services,
      logger,
      events,
      spaceId,
      entityStoreCrudClient,
    };

    const enrichments = experimentalFeatures.entityAnalyticsEntityStoreV2
      ? await resolveV2Enrichments(enrichmentOpts)
      : await resolveLegacyEnrichments(enrichmentOpts);

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
