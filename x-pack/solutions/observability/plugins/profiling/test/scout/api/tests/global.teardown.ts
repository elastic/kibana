/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalTeardownHook as obltGlobalTeardownHook, tags } from '@kbn/scout-oblt';
import { apiTest as profilingFixtures } from '../../common/fixtures';

const globalTeardownHook = mergeTests(obltGlobalTeardownHook, profilingFixtures);

// Stateful only: Universal Profiling is not supported on serverless (its setup, status and
// storage explorer routes are not registered there). Serverless will get profiling through
// OTel profiling data instead, which needs its own tests. See
// https://github.com/elastic/kibana/issues/297749
globalTeardownHook(
  'Reset profiling state after API tests',
  { tag: tags.stateful.classic },
  async ({ profilingSetup, log, profilingHelper }) => {
    log.info('Running profiling API global teardown...');

    // Cleanup policies
    await profilingHelper.cleanupPolicies({ includeAgentPolicy: true });

    // Reset profiling ES resources (data streams + indices)
    await profilingSetup.cleanup();

    log.info('Profiling API global teardown complete');
  }
);
