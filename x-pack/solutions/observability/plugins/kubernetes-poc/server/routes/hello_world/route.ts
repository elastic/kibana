/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKubernetesPocServerRoute } from '../create_kubernetes_poc_server_route';

const getHelloWorldRoute = createKubernetesPocServerRoute({
  endpoint: 'GET /internal/kubernetes_poc/hello_world',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['kibana_read'],
    },
  },
  handler: async (resources) => {
    const { logger, response } = resources;

    logger.info('Hello World endpoint called');

    return response.ok({
      body: {
        message: 'Hello World from kubernetes-poc plugin!',
        timestamp: new Date().toISOString(),
      },
    });
  },
});

export const helloWorldRouteRepository = {
  ...getHelloWorldRoute,
};
