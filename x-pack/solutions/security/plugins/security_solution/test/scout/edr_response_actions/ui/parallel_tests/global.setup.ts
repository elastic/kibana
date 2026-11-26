/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';

globalSetupHook('Prepare Fleet for EDR response-action seeds', async ({ kbnClient, log }) => {
  log.debug('[setup] initializing Fleet and installing the endpoint package in the default space');
  // Pre-installing here keeps two workers from racing the first install from their own spaces.
  await setupFleetForEndpoint(kbnClient, log);
});
