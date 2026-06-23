/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalSetupHook as obltGlobalSetupHook, tags } from '@kbn/scout-oblt';
import { apiTest as profilingFixtures } from '../../common/fixtures';

const globalSetupHook = mergeTests(obltGlobalSetupHook, profilingFixtures);

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: tags.stateful.classic },
  async ({ log, apiServices, profilingSetup, profilingHelper }) => {
    log.info('Running profiling API global setup...');
    await apiServices.fleet.internal.setup();
    log.info('Fleet infrastructure setup completed');

    // Pre-install the profiler Fleet packages once here, under the larger global-hook
    // timeout budget. The first install of the bundled profiler_collector / profiler_symbolizer
    // packages can take ~1 minute, which previously exceeded the 60s per-spec `beforeAll`
    // budget and made `01_has_setup_apm_not_installed` flaky (see issue #253221).
    // Per-spec teardown only removes the package policies and ES data streams, not the
    // installed Fleet packages, so later `setupResources()` calls stay fast.
    const status = await profilingSetup.checkStatus();
    if (!status.has_setup) {
      await profilingHelper.installPolicies();
      await profilingSetup.setupResources();
    }
    log.info('Profiling resources pre-installed');
  }
);
