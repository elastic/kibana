/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { get } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { ProductFeaturesService } from '../../../product_features_service/product_features_service';
import { RiskScoreDataClient } from '../risk_score_data_client';
import { initSavedObjects } from '../../risk_engine/utils/saved_object_configuration';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../tasks/helpers';
import {
  AssetCriticalityDataClient,
  assetCriticalityServiceFactory,
} from '../../asset_criticality';
import { WatchlistConfigClient } from '../../watchlists/management/watchlist_config';
import { calculateScoresWithESQL } from '../calculate_esql_risk_scores';
import { DEFAULT_ALERTS_INDEX, DEFAULT_RISK_SCORE_PAGE_SIZE } from '../../../../../common/constants';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import type { EntityRiskScoreRecord } from '../../../../../common/api/entity_analytics/common';
import type { WatchlistModifierInfo } from '../modifiers/entity_store_watchlist';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';

export interface RiskScoreMaintainerDeps {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  productFeaturesService: ProductFeaturesService;
}

type RiskScoreMaintainerConfig = Pick<RegisterEntityMaintainerConfig, 'setup' | 'run'>;

const RISK_SCORE_RANGE_START = 'now-30d';
const RISK_SCORE_RANGE_END = 'now';

export const createRiskScoreMaintainer = ({
  getStartServices,
  kibanaVersion,
  logger,
  auditLogger,
  productFeaturesService,
}: RiskScoreMaintainerDeps): RiskScoreMaintainerConfig => ({
  setup: async ({ status }) => {
    const namespace = status.metadata.namespace;
    const [coreStart] = await getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });

    const riskScoreDataClient = new RiskScoreDataClient({
      logger,
      kibanaVersion,
      esClient,
      namespace,
      soClient,
      auditLogger,
    });

    logger.debug(`Initializing risk score maintainer saved objects for namespace "${namespace}"`);
    await initSavedObjects({ savedObjectsClient: soClient, namespace });
    logger.debug(`Initializing risk score maintainer data client for namespace "${namespace}"`);
    await riskScoreDataClient.init();

    logger.info(`Risk score maintainer setup completed for namespace "${namespace}"`);
    return status.state;
  },
  run: async ({ status, crudClient, esClient, fakeRequest }) => {
    const namespace = status.metadata.namespace;
    const [coreStart, pluginsStart] = await getStartServices();
    const license = await pluginsStart.licensing.getLicense();

    // Advanced insights requires a platinum license (ESS) or feature enablement (Serverless).
    // In Serverless, hasAtLeast('platinum') is always true; in ESS, isEnabled() is always true.
    // Both conditions must be met to correctly gate access in either environment.
    const isFeatureEnabled = productFeaturesService.isEnabled(ProductFeatureKey.advancedInsights);
    const hasPlatinumLicense = license.hasAtLeast('platinum');

    if (!isFeatureEnabled || !hasPlatinumLicense) {
      logger.debug(
        'Risk score maintainer run skipped due to insufficient license or feature disabled'
      );
      return status.state;
    }

    logger.debug(`Risk score maintainer run started for namespace "${namespace}"`);

    const soClient = coreStart.savedObjects.getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    // ── Build entity maps from entity store ─────────────────────────────────
    const identifierToEuid = new Map<string, string>();
    const watchlistIdsByIdentifier = new Map<string, string[]>();

    let searchAfter: Array<string | number> | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await crudClient.listEntities({
        size: 1000,
        searchAfter,
      });

      for (const entity of result.entities) {
        const euid = get(entity, 'entity.id') as string | undefined;
        const entityType = (get(entity, 'entity.EngineMetadata.Type') ||
          get(entity, 'entity.type')) as string | undefined;

        if (!euid || !entityType) {
          continue;
        }

        const identifierField =
          EntityTypeToIdentifierField[entityType as EntityType] as string | undefined;
        if (!identifierField) {
          continue;
        }

        // For generic entities the identifier IS the entity.id (EUID)
        const identifierValue =
          entityType === 'generic'
            ? euid
            : (get(entity, identifierField) as string | undefined);

        if (!identifierValue) {
          continue;
        }

        identifierToEuid.set(identifierValue, euid);

        const watchlistIds = get(entity, 'entity.attributes.watchlists') as string[] | undefined;
        if (watchlistIds?.length) {
          watchlistIdsByIdentifier.set(identifierValue, watchlistIds);
        }
      }

      searchAfter = result.nextSearchAfter;
      hasMore = searchAfter != null && result.entities.length > 0;
    }

    logger.debug(
      `Risk score maintainer: found ${identifierToEuid.size} entities in entity store for namespace "${namespace}"`
    );

    // ── Build watchlists-by-identifier map ──────────────────────────────────
    const watchlistsByIdentifier = new Map<string, WatchlistModifierInfo[]>();

    if (watchlistIdsByIdentifier.size > 0) {
      const watchlistConfigClient = new WatchlistConfigClient({
        soClient,
        esClient,
        namespace,
        logger,
      });

      const watchlistConfigs = await watchlistConfigClient.list().catch((err: Error) => {
        logger.warn(
          `Risk score maintainer: failed to load watchlist configs, skipping watchlist modifiers: ${err.message}`
        );
        return [];
      });

      const watchlistInfoById = new Map<string, WatchlistModifierInfo>(
        watchlistConfigs.map((wl) => [
          wl.id,
          { id: wl.id, name: wl.name, riskModifier: wl.riskModifier },
        ])
      );

      for (const [identifierValue, wlIds] of watchlistIdsByIdentifier) {
        const infos = wlIds
          .map((id) => watchlistInfoById.get(id))
          .filter((info): info is WatchlistModifierInfo => info != null);
        if (infos.length > 0) {
          watchlistsByIdentifier.set(identifierValue, infos);
        }
      }
    }

    // ── Create asset criticality service ────────────────────────────────────
    const assetCriticalityDataClient = new AssetCriticalityDataClient({
      esClient,
      logger,
      auditLogger,
      namespace,
    });

    const assetCriticalityService = assetCriticalityServiceFactory({
      assetCriticalityDataClient,
      uiSettingsClient: coreStart.uiSettings.asScopedToClient(soClient),
    });

    // ── Calculate risk scores ────────────────────────────────────────────────
    const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${namespace}`;
    const range = { start: RISK_SCORE_RANGE_START, end: RISK_SCORE_RANGE_END };

    let scoreResult;
    try {
      scoreResult = await calculateScoresWithESQL({
        assetCriticalityService,
        esClient,
        logger,
        experimentalFeatures: allowedExperimentalValues as ExperimentalFeatures,
        index: alertsIndex,
        afterKeys: {},
        pageSize: DEFAULT_RISK_SCORE_PAGE_SIZE,
        range,
        entityStoreWatchlists: watchlistsByIdentifier,
      });
    } catch (err) {
      logger.error(`Risk score maintainer: calculation failed: ${err.message}`);
      return status.state;
    }

    const { scores } = scoreResult;
    const totalScores = Object.values(scores).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);

    if (totalScores === 0) {
      logger.debug(
        `Risk score maintainer: no risk scores calculated for namespace "${namespace}"`
      );
      return status.state;
    }

    logger.debug(
      `Risk score maintainer: calculated ${totalScores} risk scores for namespace "${namespace}"`
    );

    // ── Post-process: replace id_field/id_value with EUID, add score_type ──
    const calculationRunId = uuidv4();

    const postProcess = (
      entityScores: EntityRiskScoreRecord[] | undefined
    ): EntityRiskScoreRecord[] | undefined => {
      if (!entityScores?.length) return entityScores;
      return entityScores.map((score) => {
        const euid = identifierToEuid.get(score.id_value) ?? score.id_value;
        return {
          ...score,
          id_field: 'entity_id',
          id_value: euid,
          score_type: 'base' as const,
          calculation_run_id: calculationRunId,
        };
      });
    };

    const processedScores = {
      host: postProcess(scores.host),
      user: postProcess(scores.user),
      service: postProcess(scores.service),
      generic: postProcess(scores.generic),
    };

    // ── Write scores ─────────────────────────────────────────────────────────
    const riskScoreDataClient = new RiskScoreDataClient({
      logger,
      kibanaVersion,
      esClient,
      namespace,
      soClient,
      auditLogger,
    });

    const writer = await riskScoreDataClient.getWriter({ namespace });
    const { errors, docs_written: docsWritten } = await writer.bulk(processedScores);

    if (errors.length > 0) {
      logger.error(
        `Risk score maintainer: encountered ${errors.length} errors writing risk scores: ${errors[0]}`
      );
    }

    logger.debug(
      `Risk score maintainer: wrote ${docsWritten} risk score documents for namespace "${namespace}"`
    );

    return status.state;
  },
});

export type RegisterRiskScoreMaintainerDeps = RiskScoreMaintainerDeps;
