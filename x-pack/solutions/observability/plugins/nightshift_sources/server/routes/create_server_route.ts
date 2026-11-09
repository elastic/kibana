/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import {
  isNightshiftSpaceGatedEndpoint,
  isNightshiftSupportedSpace,
  NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE,
} from '@kbn/nightshift-shared';
import type { GetSourcesClient } from '../types';

export type NightshiftSourcesRouteHandlerResources = {
  getSourcesClient: GetSourcesClient;
} & DefaultRouteHandlerResources;

/**
 * The writes that stay reachable outside the default space, so a space set up on an earlier build
 * can be taken back down: disabling a source stops its rules, and deleting it removes the source
 * and its view. Both run the source-change hook, which refuses other spaces on its own.
 */
const SPACE_GATE_EXEMPT_ENDPOINTS: ReadonlySet<string> = new Set([
  'DELETE /internal/nightshift/sources/{sourceId}',
  'POST /internal/nightshift/sources/{sourceId}/_disable',
]);

const createPlainNightshiftSourcesServerRoute =
  createServerRouteFactory<NightshiftSourcesRouteHandlerResources>();

/**
 * Route factory for `nightshift_sources`, with the default-space gate applied centrally so a new
 * write route is covered without opting in. Creating or changing a source installs enabled
 * scheduled workflows through the source-change hook, which is exactly what must not happen in a
 * space Nightshift does not run in; reads stay open so such a space can still be looked at.
 */
export const createNightshiftSourcesServerRoute: CreateServerRouteFactory<
  NightshiftSourcesRouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  const gated = isNightshiftSpaceGatedEndpoint(config.endpoint, SPACE_GATE_EXEMPT_ENDPOINTS);

  return createPlainNightshiftSourcesServerRoute({
    ...config,
    // Async, so the refusal below surfaces as a rejected promise like any other route error.
    handler: async (resources) => {
      if (gated && !isNightshiftSupportedSpace(resources.request.spaceId)) {
        throw Boom.badRequest(NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE);
      }
      return handler(resources);
    },
  });
};
