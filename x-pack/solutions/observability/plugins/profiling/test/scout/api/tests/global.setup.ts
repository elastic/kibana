/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalSetupHook as obltGlobalSetupHook, tags } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

const globalSetupHook = mergeTests(obltGlobalSetupHook, synthtraceFixture);

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ log }) => {
    // It's required for globalteardown to work
    log.info(`Global setup for profiling API tests`);
  }
);
