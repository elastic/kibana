/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { setNightshiftEnabled, setUpDetectionEngine } from '../fixtures';

globalSetupHook(
  'Set the default space up with the detection service account',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ kbnUrl, esClient, samlAuth, apiServices, config, log }) => {
    // Every engine route answers 404 while nightshift.enabled is off, `_enable` included, and the
    // config set leaves the flag to the suites. Overrides only work locally.
    if (!config.isCloud) {
      await setNightshiftEnabled(apiServices, true);
    }

    const { serviceAccountId } = await setUpDetectionEngine({
      kbnUrl,
      esClient,
      samlAuth,
      isServerless: Boolean(config.serverless),
      log,
    });
    log.info(`The detection engine runs as [${serviceAccountId}] in the default space`);
  }
);
