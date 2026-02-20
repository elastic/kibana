/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { HttpFetchOptionsWithPath, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import { useEffect } from 'react';
import { ENTITY_STORE_ROUTES, EntityStoreStatus, FF_ENABLE_ENTITY_STORE_V2 } from '../../common';
import type { StatusRequestQuery } from '../../server/routes/apis/status';

export interface Services {
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  logger: Logger;
  spaces: SpacesPluginStart;
}

const statusRequestQuery = {
  include_components: false,
} as const satisfies StatusRequestQuery;

const getStatusRequest: HttpFetchOptionsWithPath = {
  path: ENTITY_STORE_ROUTES.STATUS,
  query: { apiVersion: '2', ...statusRequestQuery },
};

const installAllEntitiesRequest: HttpFetchOptionsWithPath = {
  path: ENTITY_STORE_ROUTES.INSTALL,
  body: JSON.stringify({}),
  query: { apiVersion: '2' },
};

/**
 * Hook to install Entity Store V2. Should be called from the root Security Solution app component.
 * @param services - Kibana services required to install Entity Store V2
 */
export const useInstallEntityStoreV2 = (services: Services) => {
  useEffect(() => {
    async function install() {
      try {
        const isEntityStoreV2Enabled = services.uiSettings.get(FF_ENABLE_ENTITY_STORE_V2);
        if (!isEntityStoreV2Enabled) return;

        const space = await services.spaces.getActiveSpace();
        if (space.id !== 'default') return;

        const statusResponse = await services.http.get<{ status: EntityStoreStatus }>(
          getStatusRequest
        );
        if (isEntityStoreInstalled(statusResponse.status)) return;

        await services.http.post(installAllEntitiesRequest);
      } catch (e) {
        services.logger.error('Failed to initialize Entity Store V2');
        services.logger.error(e);
      }
    }
    install();
  }, [services.http, services.uiSettings, services.logger, services.spaces]);
};

const isEntityStoreInstalled = (status: EntityStoreStatus): boolean =>
  status !== EntityStoreStatus.Values.not_installed;
