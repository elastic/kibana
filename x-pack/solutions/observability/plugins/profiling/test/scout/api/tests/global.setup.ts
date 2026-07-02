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
  async ({ log, apiServices }) => {
    log.info('Running profiling API global setup...');
    await apiServices.fleet.internal.setup();
    log.info('Fleet infrastructure setup completed');
  }
);
