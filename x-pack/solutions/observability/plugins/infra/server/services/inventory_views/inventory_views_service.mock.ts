/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInventoryViewsClientMock } from './inventory_views_client.mock';
import type { InventoryViewsServiceSetup, InventoryViewsServiceStart } from './types';

export const createInventoryViewsServiceSetupMock =
  (): jest.Mocked<InventoryViewsServiceSetup> => {};

export const createInventoryViewsServiceStartMock =
  (): jest.Mocked<InventoryViewsServiceStart> => ({
    getClient: jest.fn((_savedObjectsClient: any) => createInventoryViewsClientMock()),
    getScopedClient: jest.fn((_request: any) => createInventoryViewsClientMock()),
  });
