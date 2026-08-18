/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';

/**
 * Origin-only when CPS is off (byte-for-byte the HTTP-layer client). Space-routed current-user
 * client when platform CPS is on, so entity/tree/related-events searches leave the origin project.
 */
export async function getResolverClusterClient(
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest
): Promise<{ client: IScopedClusterClient; cpsRead: boolean }> {
  const originClient = (await context.core).elasticsearch.client;
  const endpointService = (await context.securitySolution).getEndpointService();
  const cpsRead = endpointService.isPlatformCpsRead(request);

  return {
    client: cpsRead ? endpointService.getResolverScopedClusterClient(request) : originClient,
    cpsRead,
  };
}
