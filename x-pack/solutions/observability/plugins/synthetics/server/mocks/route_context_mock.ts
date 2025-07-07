/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import { SyntheticsServerSetup } from '../types';
import { SyntheticsService } from '../synthetics_service/synthetics_service';
import { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getServerMock } from './server_mock';

export const getRouteContextMock = () => {
  const serverMock: SyntheticsServerSetup = getServerMock();

  const syntheticsService = new SyntheticsService(serverMock);
  const monitorConfigRepo = new MonitorConfigRepository(
    serverMock.authSavedObjectsClient as unknown as SavedObjectsClientContract,
    serverMock.encryptedSavedObjects.getClient()
  );

  const syntheticsMonitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);
  return {
    routeContext: {
      syntheticsMonitorClient,
      server: serverMock,
      request: {} as unknown as KibanaRequest,
      savedObjectsClient:
        serverMock.authSavedObjectsClient as unknown as SavedObjectsClientContract,
      monitorConfigRepository: monitorConfigRepo,
    } as any,
    syntheticsService,
    serverMock,
  };
};
