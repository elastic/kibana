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

// -------- v1 queries --------
const getV1StatusRequest: HttpFetchOptionsWithPath = {
  path: '/api/entity_store/status',
  query: statusRequestQuery,
  version: '2023-10-31',
};

const getV1ListEnginesRequest: HttpFetchOptionsWithPath = {
  path: '/api/entity_store/engines',
  version: '2023-10-31',
};

const postv1StopEngineRequest = (entityType: string): HttpFetchOptionsWithPath => ({
  path: `/api/entity_store/engines/${entityType}/stop`,
  version: '2023-10-31',
});

const deleteV1UninstallEngineRequest = (entityType: string): HttpFetchOptionsWithPath => ({
  path: `/api/entity_store/engines/${entityType}`,
  version: '2023-10-31',
});

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

        const statusResponseV2 = await services.http.get<{ status: EntityStoreStatus }>(
          getStatusRequest
        );
        if (isEntityStoreInstalled(statusResponseV2.status)) return;

        const space = await services.spaces.getActiveSpace();
        const statusResponseV1 = await services.http.get<{ status: EntityStoreStatus }>(
          getV1StatusRequest
        );

        const isV1Installed = isEntityStoreInstalled(statusResponseV1.status);

        const installTasks: Array<Promise<unknown>> = [];
        if (isV1Installed) {
          installTasks.push(
            stopAndUninstallV1Engines({ http: services.http, logger: services.logger })
          );
        }

        if (space.id === 'default' || isV1Installed) {
          installTasks.push(services.http.post(installAllEntitiesRequest));
        }

        await Promise.all(installTasks);
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

const stopAndUninstallV1Engines = async ({ http, logger }: Pick<Services, 'http' | 'logger'>) => {
  const resp = await http.get<{ engines?: Array<{ type: string }> }>(getV1ListEnginesRequest);
  const v1Engines = resp.engines ?? [];

  await Promise.all(
    v1Engines.map(async ({ type }) => {
      try {
        await http.post(postv1StopEngineRequest(type));
        await http.delete(deleteV1UninstallEngineRequest(type));
      } catch (e) {
        logger.error(`Failed to uninstall Entity Store v1 engine ${type}`);
        logger.error(e);
      }
    })
  );
};
