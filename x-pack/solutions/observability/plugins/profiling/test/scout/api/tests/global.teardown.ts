/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';
import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '../../common/fixtures/constants';

globalTeardownHook(
  'Reset profiling state after API tests',
  { tag: tags.stateful.classic },
  async ({ profilingSetup, apiServices, log }) => {
    log.info('Running profiling API global teardown...');

    // Clean up Fleet package policies left by integration tests
    try {
      const res = await apiServices.fleet.package_policies.get({ perPage: 1000 });
      const policies = res.data.items;

      const collectorId = policies.find(
        (item: { name: string }) => item.name === COLLECTOR_PACKAGE_POLICY_NAME
      )?.id;
      const symbolizerId = policies.find(
        (item: { name: string }) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME
      )?.id;

      await Promise.all([
        collectorId ? apiServices.fleet.package_policies.delete(collectorId) : Promise.resolve(),
        symbolizerId ? apiServices.fleet.package_policies.delete(symbolizerId) : Promise.resolve(),
      ]);

      if (collectorId || symbolizerId) {
        log.info('Cleaned up profiling Fleet package policies');
      }
    } catch (error) {
      log.warning(`Fleet policy cleanup (non-fatal): ${error}`);
    }

    // Reset profiling ES resources (data streams + indices)
    await profilingSetup.cleanup();

    log.info('Profiling API global teardown complete');
  }
);
