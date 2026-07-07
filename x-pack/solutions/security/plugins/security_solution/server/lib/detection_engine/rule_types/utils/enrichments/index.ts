/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type { DetectionAlertLatest } from '../../../../../../common/api/detection_engine/model/alerts';
import { createV2HostRiskEnrichments } from './enrichment_by_type/host_risk';
import { createV2UserRiskEnrichments } from './enrichment_by_type/user_risk';
import { createV2ServiceRiskEnrichments } from './enrichment_by_type/service_risk';
import {
  createV2HostAssetCriticalityEnrichments,
  createV2ServiceAssetCriticalityEnrichments,
  createV2UserAssetCriticalityEnrichments,
} from './enrichment_by_type/asset_criticality';
import type {
  EnrichEvents,
  EnrichEventsParams,
  EnrichmentOptions,
  EventsForEnrichment,
  EventsMapByEnrichments,
} from './types';
import { applyEnrichmentsToEvents } from './utils/transforms';
import { isIndexExist } from './utils/is_index_exist';

const resolveV2Enrichments = async <T extends DetectionAlertLatest>(
  opts: EnrichmentOptions<T>
): Promise<Array<Promise<EventsMapByEnrichments>>> => {
  const { services, spaceId, entityStoreCrudClient } = opts;

  if (entityStoreCrudClient === undefined) {
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

export const enrichEvents: EnrichEvents = async <T extends DetectionAlertLatest>({
  services,
  logger,
  events,
  spaceId,
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

    const enrichments = await resolveV2Enrichments(enrichmentOpts);
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
