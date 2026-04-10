/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { SyntheticsCCSSettings } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  DefaultSyntheticsCCSSettingsRepository,
  DEFAULT_CCS_SETTINGS,
} from '../../services/synthetics_ccs_settings_repository';

export const createGetCCSSettingsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsCCSSettings
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.CCS_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient, server }) => {
    if (server.isElasticsearchServerless) {
      return DEFAULT_CCS_SETTINGS;
    }

    const repository = new DefaultSyntheticsCCSSettingsRepository(savedObjectsClient);
    return await repository.get();
  },
});

const CCSSettingsSchema = schema.object({
  useAllRemoteClusters: schema.boolean(),
  selectedRemoteClusters: schema.arrayOf(schema.string()),
  remoteKibanaUrls: schema.recordOf(schema.string(), schema.string()),
});

export const createPutCCSSettingsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsCCSSettings
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.CCS_SETTINGS,
  validate: {
    body: CCSSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, server, response }) => {
    if (server.isElasticsearchServerless) {
      return response.badRequest({
        body: { message: 'CCS settings are not available in serverless mode.' },
      }) as never;
    }

    const repository = new DefaultSyntheticsCCSSettingsRepository(savedObjectsClient);
    return await repository.save(request.body as SyntheticsCCSSettings);
  },
});
