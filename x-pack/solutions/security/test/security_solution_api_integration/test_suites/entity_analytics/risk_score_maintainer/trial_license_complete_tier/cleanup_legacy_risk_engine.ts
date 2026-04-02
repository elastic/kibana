/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestTransformId } from '@kbn/security-solution-plugin/server/lib/entity_analytics/utils/transforms';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  riskEngineRouteHelpersFactory,
  elasticAssetCheckerFactory,
  entityAnalyticsRouteHelpersFactory,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest, log);
  const elasticAssetChecker = elasticAssetCheckerFactory(getService);

  // Note: the cleanup migration also removes the legacy risk_engine:risk_scoring task, but we
  // cannot test that here because the task type is not registered when entityAnalyticsEntityStoreV2
  // is enabled (which this test suite requires). The cleanup code handles the "task not found"
  // case gracefully via SavedObjectsErrorHelpers.isNotFoundError.
  describe('@ess @serverless @skipInServerlessMKI cleanup legacy risk engine', () => {
    const transformId = getLatestTransformId('default');

    afterEach(async () => {
      await riskEngineRoutes.cleanUp();
    });

    it('should delete the legacy transform after running migrations', async () => {
      // Initialize the legacy risk engine. This returns 400 because the risk_engine:risk_scoring
      // task type is not registered when entityAnalyticsEntityStoreV2 is enabled, but it still
      // successfully installs all other resources (data stream, transform, saved object, etc.).
      await riskEngineRoutes.init(400);

      // Verify the transform exists before migration
      await elasticAssetChecker.expectTransformExists(transformId);

      // Run migrations — the cleanup runs because entityAnalyticsEntityStoreV2 is enabled in the config
      await entityAnalyticsRoutes.runMigrations();

      // Verify the transform was deleted
      await elasticAssetChecker.expectTransformNotFound(transformId);
    });
  });
};
