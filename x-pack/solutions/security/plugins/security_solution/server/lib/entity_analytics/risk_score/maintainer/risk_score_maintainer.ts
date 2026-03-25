/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { ProductFeaturesService } from '../../../product_features_service/product_features_service';
import { RiskScoreDataClient } from '../risk_score_data_client';
import { initSavedObjects } from '../../risk_engine/utils/saved_object_configuration';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../tasks/helpers';

export interface RiskScoreMaintainerDeps {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  productFeaturesService: ProductFeaturesService;
}

type RiskScoreMaintainerConfig = Pick<RegisterEntityMaintainerConfig, 'setup' | 'run'>;

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
  run: async ({ status, crudClient }) => {
    const [, pluginsStart] = await getStartServices();
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

    logger.debug('Risk score maintainer run');

    return status.state;
  },
});

export type RegisterRiskScoreMaintainerDeps = RiskScoreMaintainerDeps;
