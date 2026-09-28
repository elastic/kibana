/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { InvestigationStatus } from '../../common';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

export const bulkGetInvestigationStatusesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/_status',
  options: {
    access: 'internal',
    summary: 'Bulk get investigation statuses',
    description: 'Retrieves the current statuses for a list of investigation IDs.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:read'],
    },
  },
  params: z.object({
    body: z.object({
      investigation_ids: z.array(z.string().min(1).max(MAX_KEYWORD_LENGTH)).max(1000),
    }),
  }),
  handler: async ({
    request,
    params,
    getInvestigationsClient,
  }): Promise<{ statuses: Record<string, InvestigationStatus> }> => {
    const investigationClient = getInvestigationsClient(request);
    try {
      const statuses = await investigationClient.getStatuses(params.body.investigation_ids);
      return { statuses };
    } catch (err) {
      rethrowInvestigationClientError(err);
    }
  },
});
