/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { PutSandboxConnectorEnabledResponse } from '../../common/sandbox_connectors';
import { MAX_CONNECTOR_ID_LENGTH } from '../saved_objects/sandbox_connector_settings_saved_object';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const putSandboxConnectorEnabledRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/sandbox_connectors/{id}/enabled',
  options: {
    access: 'internal',
    summary: 'Switch a sandbox connector on or off for Nightshift',
    description:
      'Every sandbox-capable connector is on for the investigation agent unless switched off here. ' +
      'A connector that is off stays in Kibana but leaves the agent allow-list on its next run.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({
    path: z.object({ id: z.string().min(1).max(MAX_CONNECTOR_ID_LENGTH) }),
    body: z.object({ enabled: z.boolean() }),
  }),
  handler: async ({
    request,
    params,
    sandboxConnectorSettingsClient,
  }): Promise<PutSandboxConnectorEnabledResponse> => {
    const disabledIds = await sandboxConnectorSettingsClient.setConnectorEnabled(request, {
      connectorId: params.path.id,
      enabled: params.body.enabled,
    });
    return { id: params.path.id, enabled: !disabledIds.includes(params.path.id) };
  },
});
