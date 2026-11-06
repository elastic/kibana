/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { isNightshiftSpaceGatedEndpoint } from '@kbn/nightshift-shared';
import { assertNightshiftSpace } from '../lib/assert_nightshift_space';
import type { NightshiftInvestigationsRouteHandlerResources } from './types';

/**
 * The writes that stay reachable outside the default space: taking a space set up on an earlier
 * build back down is the one change Nightshift still accepts there.
 */
const SPACE_GATE_EXEMPT_ENDPOINTS: ReadonlySet<string> = new Set([
  'POST /internal/nightshift/investigations/service_account/_disable',
]);

const createPlainNightshiftInvestigationsServerRoute =
  createServerRouteFactory<NightshiftInvestigationsRouteHandlerResources>();

/**
 * Route factory for `nightshift_investigations`, with the default-space gate applied centrally so
 * a new write route is covered without opting in: every non-GET endpoint but the exempt ones is
 * refused outside the space Nightshift runs in.
 */
export const createNightshiftInvestigationsServerRoute: CreateServerRouteFactory<
  NightshiftInvestigationsRouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  const gated = isNightshiftSpaceGatedEndpoint(config.endpoint, SPACE_GATE_EXEMPT_ENDPOINTS);

  return createPlainNightshiftInvestigationsServerRoute({
    ...config,
    // Async, so the refusal below surfaces as a rejected promise like any other route error.
    handler: async (resources) => {
      if (gated) {
        assertNightshiftSpace(resources.request.spaceId);
      }
      return handler(resources);
    },
  });
};
