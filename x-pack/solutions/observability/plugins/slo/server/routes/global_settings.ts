/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import {
  getSLOGlobalSettingsResponseSchema,
  putSLOGlobalSettingsParamsSchema,
  putSLOGlobalSettingsResponseSchema,
} from '@kbn/slo-schema';
import { toGlobalSettingsResponse, updateGlobalSettings } from '../services/global_settings';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { assertSloGlobalAdmin } from './utils/assert_slo_global_admin';

const GLOBAL_ADMIN_DESCRIPTION =
  'Global SLO settings apply to all spaces. You must have `all` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges in all spaces.';

const AVAILABILITY = { stability: 'tech_preview', since: '9.7.0' } as const;

export const getSLOGlobalSettingsRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slo_settings/global 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get the global SLO settings',
    description: `${GLOBAL_ADMIN_DESCRIPTION} The response holds the saved settings and the resolved settings, which a kibana.yml setting can override.`,
    operationId: 'getSloGlobalSettingsOp',
    availability: AVAILABILITY,
    oasOperationObject: () => path.join(__dirname, 'examples/get_global_settings.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  responses: {
    200: { description: 'Successful request', body: () => getSLOGlobalSettingsResponseSchema },
  },
  handler: async ({ request, logger, plugins, config, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    await assertSloGlobalAdmin({ authz: plugins.security.setup.authz, request });
    const { globalSettingsRepository } = await getScopedClients({ request, logger });

    return toGlobalSettingsResponse({
      stored: await globalSettingsRepository.get(),
      override: config.sliRetention,
    });
  },
});

export const updateSLOGlobalSettingsRoute = createSloServerRoute({
  endpoint: 'PUT /api/observability/slo_settings/global 2023-10-31',
  options: {
    access: 'public',
    summary: 'Update the global SLO settings',
    description: `${GLOBAL_ADMIN_DESCRIPTION} Each settings block is replaced as a whole. When the setting is set in kibana.yml, the request still saves it, and the kibana.yml value stays effective until it is removed.`,
    operationId: 'updateSloGlobalSettingsOp',
    availability: AVAILABILITY,
    oasOperationObject: () => path.join(__dirname, 'examples/put_global_settings.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: putSLOGlobalSettingsParamsSchema,
  responses: {
    200: { description: 'Successful request', body: () => putSLOGlobalSettingsResponseSchema },
  },
  handler: async ({ request, logger, params, plugins, config, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    await assertSloGlobalAdmin({ authz: plugins.security.setup.authz, request });
    const { globalSettingsRepository } = await getScopedClients({ request, logger });

    return updateGlobalSettings({
      repository: globalSettingsRepository,
      override: config.sliRetention,
      settings: params.body,
    });
  },
});
