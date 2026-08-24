/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';

export interface ResolverClusterClientResult {
  client: IScopedClusterClient;
  cpsRead: boolean;
}

/**
 * Bound once at route registration and handed to the resolver handlers, so the handlers stay
 * unaware of how the CPS decision and the project-routed client are wired together.
 */
export type GetResolverClusterClient = (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest
) => Promise<ResolverClusterClientResult>;

interface GetResolverClusterClientDeps {
  context: SecuritySolutionRequestHandlerContext;
  request: KibanaRequest;
  /** Resolves the deployment-wide cluster client from start services, lazily per request. */
  getClusterClient: () => Promise<IClusterClient>;
  /** `true` when the deployment has Cross-Project Search on; drives Analyzer's cross-project reads. */
  platformCpsEnabled: boolean;
}

/**
 * Origin-only when platform CPS is off (byte-for-byte the HTTP-layer client). Space-routed
 * current-user client when platform CPS is on, so entity/tree/related-events searches leave the
 * origin project.
 */
export async function getResolverClusterClient({
  context,
  request,
  getClusterClient,
  platformCpsEnabled,
}: GetResolverClusterClientDeps): Promise<ResolverClusterClientResult> {
  if (!platformCpsEnabled) {
    return { client: (await context.core).elasticsearch.client, cpsRead: false };
  }

  const clusterClient = await getClusterClient();

  return {
    client: clusterClient.asScoped(request, { projectRouting: 'space' }),
    cpsRead: true,
  };
}
