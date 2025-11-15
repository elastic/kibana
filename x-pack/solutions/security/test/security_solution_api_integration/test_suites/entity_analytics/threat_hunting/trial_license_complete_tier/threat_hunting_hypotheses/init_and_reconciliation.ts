/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/api_integration/ftr_provider_context';
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const log = getService('log');

  describe('@ess Threat Hunting Hypotheses init', () => {
    it('should create the hypotheses saved objects on Kibana startup', async () => {
      await retry.tryForTime(60_000, async () => {
        const res = await kibanaServer.savedObjects.find({
          type: 'threat-hunting-hypothesis',
        });
        log.debug(`found ${res.total} threat-hunting-hypothesis SOs`);
        if (!res.total || res.total === 0) {
          throw new Error('Not initialised yet');
        }
        return res;
      });
    });
    it('should delete outdated hypotheses saved objects upon reconciliation', async () => {
      /**
       * TODO: Implement
       * 1. Create outdated saved objects (with version less than HYPOTHESES_VERSION)
       * 2. Trigger the reconciliation process -
       * reference: x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/migrations/index.ts
       * call run migrations for all entity analytics, add threat hunting to this - await entityAnalyticsRoutes.runMigrations();?
       *
       * Then split init_and_recon out - init just in start() init_and_recon called via above entityAnalyticsRoutes.runMigrations()
       * rename to updateThreatHuntingHypothesesDefinitions instead of init_and_recon
       * 3. Verify that the outdated saved objects have been deleted
       *
       */
    });
  });
}
