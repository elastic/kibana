/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { createSloServerRoute } from '../../create_slo_server_route';
import type { SLORouteHandlerResources } from '../../types';
import { assertCompositeSloEnabled } from '../utils/assert_composite_slo_enabled';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const createCompositeSloServerRoute: CreateServerRouteFactory<
  SLORouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  return createSloServerRoute({
    ...config,
    handler: async (options) => {
      const core = await options.context.core;
      await assertCompositeSloEnabled(core);
      await assertPlatinumLicense(options.plugins);

      return handler(options);
    },
  });
};
