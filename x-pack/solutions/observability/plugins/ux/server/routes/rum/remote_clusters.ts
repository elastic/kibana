/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumRemoteCluster } from '../../../common/rum_ccs';
import { listRumRemoteClusters } from '../../lib/rum_search_client';
import { createUxServerRoute } from '../create_ux_server_route';

export const listRumRemoteClustersRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/remote_clusters',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async ({ context }): Promise<RumRemoteCluster[]> => {
    const { elasticsearch } = await context.core;
    return listRumRemoteClusters(elasticsearch.client.asInternalUser);
  },
});
