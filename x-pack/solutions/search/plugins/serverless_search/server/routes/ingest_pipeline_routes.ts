/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../plugin';
import { errorHandler } from '../utils/error_handler';

export const registerIngestPipelineRoutes = ({ logger, router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/ingest_pipelines',
      validate: {},
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const privileges = await client.asCurrentUser.security.hasPrivileges({
        cluster: ['manage_pipeline'],
      });

      const canManagePipelines = privileges?.cluster.manage_pipeline;

      if (!canManagePipelines) {
        return response.ok({
          body: { pipelines: {}, canManagePipelines: false },
        });
      }
      const pipelines = await client.asCurrentUser.ingest.getPipeline();

      return response.ok({
        body: {
          pipelines,
          canManagePipelines,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
};
