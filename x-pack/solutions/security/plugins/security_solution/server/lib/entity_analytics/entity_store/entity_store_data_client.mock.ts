/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreDataClient } from './entity_store_data_client';

const createEntityStoreDataClientMock = () =>
  ({
    init: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    searchEntities: jest.fn(),
  } as unknown as jest.Mocked<EntityStoreDataClient>);

export const entityStoreDataClientMock = { create: createEntityStoreDataClientMock };
