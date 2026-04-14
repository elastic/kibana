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
  getSyntheticsDynamicSettings,
  setSyntheticsDynamicSettings,
} from '../../saved_objects/synthetics_settings';

const DEFAULT_CCS_SETTINGS: SyntheticsCCSSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  remoteKibanaUrls: {},
};

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

    const dynamicSettings = await getSyntheticsDynamicSettings(savedObjectsClient);
    return {
      useAllRemoteClusters: dynamicSettings.useAllRemoteClusters ?? false,
      selectedRemoteClusters: dynamicSettings.selectedRemoteClusters ?? [],
      remoteKibanaUrls: dynamicSettings.remoteKibanaUrls ?? {},
    };
  },
});

const CCSSettingsSchema = schema.object({
  useAllRemoteClusters: schema.boolean(),
  selectedRemoteClusters: schema.arrayOf(schema.string(), { maxSize: 100 }),
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

    const prevSettings = await getSyntheticsDynamicSettings(savedObjectsClient);
    const body = request.body as SyntheticsCCSSettings;

    const updated = await setSyntheticsDynamicSettings(savedObjectsClient, {
      ...prevSettings,
      useAllRemoteClusters: body.useAllRemoteClusters,
      selectedRemoteClusters: body.selectedRemoteClusters,
      remoteKibanaUrls: body.remoteKibanaUrls,
    });

    return {
      useAllRemoteClusters: updated.useAllRemoteClusters ?? false,
      selectedRemoteClusters: updated.selectedRemoteClusters ?? [],
      remoteKibanaUrls: updated.remoteKibanaUrls ?? {},
    };
  },
});
