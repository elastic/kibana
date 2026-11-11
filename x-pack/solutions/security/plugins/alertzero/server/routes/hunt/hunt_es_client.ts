/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IClusterClient, KibanaRequest } from '@kbn/core/server';

/**
 * The client every Hunt route reads telemetry with: the calling user, scoped with the
 * space's project routing. On Serverless CPS that follows the space's routing (and fans out
 * to every project when the space has none), which is what lets a `<project>:<pattern>`
 * default data view entry resolve; core strips the parameter when CPS is off, so it is the
 * right client on stateful too. The worker's sweep reaches these routes under `/s/<space>/`,
 * so the same client serves it. The route context's client cannot be re-scoped, hence the
 * cluster client.
 */
export const huntEsClient = ({
  getClusterClient,
  request,
}: {
  getClusterClient: () => IClusterClient;
  request: KibanaRequest;
}): ElasticsearchClient =>
  getClusterClient().asScoped(request, { projectRouting: 'space' }).asCurrentUser;
