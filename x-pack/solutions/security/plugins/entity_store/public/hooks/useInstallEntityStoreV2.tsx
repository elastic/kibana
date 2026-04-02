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
import { EntityStoreStatus } from '../../common';
import { ENTITY_STORE_ROUTES, FF_ENABLE_ENTITY_STORE_V2 } from '../../common';
import type { StatusRequestQuery } from '../../server/routes/apis/status';

export interface Services {
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  logger: Logger;
  spaces: SpacesPluginStart;
}

interface EntityStoreV1StatusResponse {
  status: EntityStoreStatus;
}

const statusRequestQuery = {
  include_components: false,
} as const satisfies StatusRequestQuery;

const getStatusRequest: HttpFetchOptionsWithPath = {
  path: ENTITY_STORE_ROUTES.STATUS,
  query: { apiVersion: '2', ...statusRequestQuery },
};

const getStatusV1Request: HttpFetchOptionsWithPath = {
  path: '/api/entity_store/status',
};

const installAllEntitiesRequest: HttpFetchOptionsWithPath = {
  path: ENTITY_STORE_ROUTES.INSTALL,
  body: JSON.stringify({}),
  query: { apiVersion: '2' },
};

const initEntityMaintainersRequest: HttpFetchOptionsWithPath = {
  path: ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT,
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
        // Install v2 and remove v1 in default namespace AND every namespace where v1 is currently installed
        if (space.id !== 'default' && !(await isEntityStoreV1Installed(services.http))) return;

        const statusResponse = await services.http.get<{ status: EntityStoreStatus }>(
          getStatusRequest
        );
        const isEntityStoreV2Installed = isEntityStoreInstalled(statusResponse.status);
        // Entity store already installed → init entity maintainers only.
        if (isEntityStoreV2Installed) {
          await services.http.post(initEntityMaintainersRequest);
          return;
        }
        // Entity store not installed → install entity store, then init entity maintainers.
        await services.http.post(installAllEntitiesRequest);
        await services.http.post(initEntityMaintainersRequest);
      } catch (e) {
        services.logger.error('Failed to initialize Entity Store V2');
        services.logger.error(e);
      }
    }
    install();
  }, [services.http, services.uiSettings, services.logger, services.spaces]);
};

const isEntityStoreInstalled = (status: EntityStoreStatus): boolean =>
  status !== EntityStoreStatus.enum.not_installed;

export const isEntityStoreV1Installed = async (http: HttpSetup): Promise<boolean> => {
  const response = await http.get<EntityStoreV1StatusResponse>(getStatusV1Request);

  return isEntityStoreInstalled(response.status);
};
