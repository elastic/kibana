/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import * as t from 'io-ts';
import {
  DEFAULT_BRANCH_MAX_LENGTH,
  emptyRumAppSettings,
  ISSUE_LABELS_MAX_LENGTH,
  normalizeRumAppSettings,
  REPOSITORY_URL_MAX_LENGTH,
  rumAppSettingsSoId,
  RUM_APP_SERVICE_NAME_MAX_LENGTH,
  RUM_APP_SETTINGS_SO_TYPE,
  SOURCE_ROOT_MAX_LENGTH,
  type RumAppSettings,
} from '../../../common/rum_app_settings';
import { createUxServerRoute } from '../create_ux_server_route';
import { boundedString } from './query';

const decodeServiceName = (raw: string): string => {
  try {
    return decodeURIComponent(raw).trim().slice(0, RUM_APP_SERVICE_NAME_MAX_LENGTH);
  } catch {
    return raw.trim().slice(0, RUM_APP_SERVICE_NAME_MAX_LENGTH);
  }
};

const settingsBody = t.partial({
  repositoryUrl: boundedString(REPOSITORY_URL_MAX_LENGTH),
  defaultBranch: boundedString(DEFAULT_BRANCH_MAX_LENGTH),
  sourceRoot: boundedString(SOURCE_ROOT_MAX_LENGTH),
  issueLabels: boundedString(ISSUE_LABELS_MAX_LENGTH),
});

const serviceNamePath = t.type({
  path: t.type({ serviceName: boundedString(1024) }),
});

export const getRumAppSettingsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/apps/{serviceName}/settings',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: serviceNamePath,
  handler: async (resources): Promise<RumAppSettings> => {
    const serviceName = decodeServiceName(resources.params.path.serviceName);
    if (!serviceName) {
      return emptyRumAppSettings('');
    }
    const { savedObjects } = await resources.context.core;
    try {
      const so = await savedObjects.client.get<RumAppSettings>(
        RUM_APP_SETTINGS_SO_TYPE,
        rumAppSettingsSoId(serviceName)
      );
      return normalizeRumAppSettings(serviceName, so.attributes);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return emptyRumAppSettings(serviceName);
      }
      throw error;
    }
  },
});

export const putRumAppSettingsRoute = createUxServerRoute({
  endpoint: 'PUT /internal/ux/rum/apps/{serviceName}/settings',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ serviceName: boundedString(1024) }),
    body: settingsBody,
  }),
  handler: async (resources): Promise<RumAppSettings> => {
    const serviceName = decodeServiceName(resources.params.path.serviceName);
    if (!serviceName) {
      return emptyRumAppSettings('');
    }
    const attributes = normalizeRumAppSettings(serviceName, resources.params.body);
    const { savedObjects } = await resources.context.core;
    const so = await savedObjects.client.create<RumAppSettings>(
      RUM_APP_SETTINGS_SO_TYPE,
      attributes,
      {
        id: rumAppSettingsSoId(serviceName),
        overwrite: true,
      }
    );
    return normalizeRumAppSettings(serviceName, so.attributes);
  },
});
