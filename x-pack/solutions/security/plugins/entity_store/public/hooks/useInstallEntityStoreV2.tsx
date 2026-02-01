/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { HttpFetchOptionsWithPath, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import { useEffect } from 'react';
import { ENTITY_STORE_ROUTES, FF_ENABLE_ENTITY_STORE_V2 } from '../../common';

interface Services {
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  logger: Logger;
}

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
    // TODO: check v1 opt-out status before initializing
    const isEntityStoreV2Enabled = services.uiSettings.get(FF_ENABLE_ENTITY_STORE_V2);
    if (!isEntityStoreV2Enabled) return;

    services.http.post(installAllEntitiesRequest).catch((e) => {
      const logger = services.logger.get('InitEntityStoreV2');
      logger.error('Failed to initialize');
      logger.error(e);
    });
  }, [services.http, services.uiSettings, services.logger]);
};
