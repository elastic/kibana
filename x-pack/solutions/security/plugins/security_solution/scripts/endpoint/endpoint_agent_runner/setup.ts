/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ensureSpaceIdExists } from '../common/spaces';
import { getRuntimeServices, startRuntimeServices, stopRuntimeServices } from './runtime';
import { checkDependencies } from './pre_check';
import { enrollEndpointHost } from './elastic_endpoint';
import type { StartRuntimeServicesOptions } from './types';
import { startFleetServerIfNecessary } from '../common/fleet_server/fleet_server_services';
import { enableFleetSpaceAwareness } from '../common/fleet_services';

export const setupAll = async (options: StartRuntimeServicesOptions) => {
  await startRuntimeServices(options);
  const { kbnClient, log } = getRuntimeServices();

  if (options.spaceId && options.spaceId !== DEFAULT_SPACE_ID) {
    await enableFleetSpaceAwareness(kbnClient);
    await ensureSpaceIdExists(kbnClient, options.spaceId);
  }

  await checkDependencies();

  await startFleetServerIfNecessary({
    kbnClient,
    logger: log,
    version: options.version,
  });

  await enrollEndpointHost();

  await stopRuntimeServices();
};
