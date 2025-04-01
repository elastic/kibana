/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { failedDependency, forbidden } from '@hapi/boom';
import { getGlobalDiagnosis } from '../../services/get_diagnosis';
import { createSloServerRoute } from '../create_slo_server_route';

export const getDiagnosisRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_diagnosis',
  options: { access: 'internal' },
  security: {
    authz: {
      enabled: false,
      reason: 'The endpoint is used to diagnose SLOs and does not require any specific privileges.',
    },
  },
  params: undefined,
  handler: async ({ context, plugins }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const licensing = await plugins.licensing.start();

    try {
      const response = await getGlobalDiagnosis(esClient, licensing);
      return response;
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 403) {
        throw forbidden('Insufficient Elasticsearch cluster permissions to access feature.');
      }
      throw failedDependency(error);
    }
  },
});
