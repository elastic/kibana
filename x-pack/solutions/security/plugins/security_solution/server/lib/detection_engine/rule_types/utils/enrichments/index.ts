/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHostRiskEnrichments } from './enrichment_by_type/host_risk';

import { createUserRiskEnrichments } from './enrichment_by_type/user_risk';

import {
  createHostAssetCriticalityEnrichments,
  createUserAssetCriticalityEnrichments,
} from './enrichment_by_type/asset_criticality';
import { getAssetCriticalityIndex } from '../../../../../../common/entity_analytics/asset_criticality';
import type {
  EnrichEventsFunction,
  EventsMapByEnrichments,
  CreateEnrichEventsFunction,
} from './types';
import { applyEnrichmentsToEvents } from './utils/transforms';
import { isIndexExist } from './utils/is_index_exist';
import { getHostRiskIndex, getUserRiskIndex } from '../../../../../../common/search_strategy';

export const enrichEvents: EnrichEventsFunction = async ({
  services,
  logger,
  events,
  spaceId,
  experimentalFeatures,
}) => {
  try {
    const enrichments: Array<Promise<EventsMapByEnrichments>> = [];

    logger.debug('Alert enrichments started');
    const isNewRiskScoreModuleAvailable = experimentalFeatures?.riskScoringRoutesEnabled ?? false;

    let isNewRiskScoreModuleInstalled = false;
    if (isNewRiskScoreModuleAvailable) {
      isNewRiskScoreModuleInstalled = await isIndexExist({
        services,
        index: getHostRiskIndex(spaceId, true, true),
      });
    }

    const [isHostRiskScoreIndexExist, isUserRiskScoreIndexExist] = await Promise.all([
      isIndexExist({
        services,
        index: getHostRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled),
      }),
      isIndexExist({
        services,
        index: getUserRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled),
      }),
    ]);

    if (isHostRiskScoreIndexExist) {
      enrichments.push(
        createHostRiskEnrichments({
          services,
          logger,
          events,
          spaceId,
          isNewRiskScoreModuleInstalled,
        })
      );
    }

    if (isUserRiskScoreIndexExist) {
      enrichments.push(
        createUserRiskEnrichments({
          services,
          logger,
          events,
          spaceId,
          isNewRiskScoreModuleInstalled,
        })
      );
    }

    const assetCriticalityIndexExist = await isIndexExist({
      services,
      index: getAssetCriticalityIndex(spaceId),
    });
    if (assetCriticalityIndexExist) {
      enrichments.push(
        createUserAssetCriticalityEnrichments({
          services,
          logger,
          events,
          spaceId,
        })
      );
      enrichments.push(
        createHostAssetCriticalityEnrichments({
          services,
          logger,
          events,
          spaceId,
        })
      );
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

export const createEnrichEventsFunction: CreateEnrichEventsFunction =
  ({ services, logger }) =>
  (events, { spaceId }: { spaceId: string }, experimentalFeatures) =>
    enrichEvents({
      events,
      services,
      logger,
      spaceId,
      experimentalFeatures,
    });
