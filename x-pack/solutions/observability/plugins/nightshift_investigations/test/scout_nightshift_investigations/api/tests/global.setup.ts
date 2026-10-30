/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { setUpNightshiftServiceAccount } from '../fixtures';

globalSetupHook(
  'Set the default space up with the Nightshift service accounts',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ kbnUrl, esClient, samlAuth, config, log }) => {
    // Investigations only run as the Nightshift agent service account, so every spec that starts
    // one needs the space set up first. Once for the whole run: the accounts belong to the
    // deployment, and two workers creating the same account at once conflict.
    await setUpNightshiftServiceAccount({
      kbnUrl,
      esClient,
      samlAuth,
      isServerless: Boolean(config.serverless),
      log,
    });
  }
);
