/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { disableInvestigationRunLimits, setUpNightshiftServiceAccount } from '../fixtures';

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
    // The specs share one deployment, and together they start more investigations than the daily
    // limits allow. None of them asserts on the limits.
    //
    // Stateful only: the route is gated on `nightshift.enabled`, which the stateful config set
    // turns on at boot while the Serverless one leaves it to the specs, so calling it there would
    // fail the setup with a 403. Only stateful specs start investigations.
    if (!config.serverless) {
      await disableInvestigationRunLimits({ kbnUrl, samlAuth, log });
    }
  }
);
