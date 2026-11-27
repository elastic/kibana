/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';

globalSetupHook('Prepare Fleet for EDR policy tests', async ({ kbnClient, log }) => {
  log.debug('[setup] initializing Fleet and installing the endpoint package in the default space');
  // Install the package once, here: the per-test policy fixture only checks it exists, and two
  // workers installing it at the same time race each other.
  await setupFleetForEndpoint(kbnClient, log);
});
