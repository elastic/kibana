/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreESQLService } from './entity_store_esql_service';

const createEntityStoreEsqlServiceMock = () =>
  ({
    runEntityStoreCycleForAllEntities: jest.fn(),
    startTask: jest.fn(),
    stopTask: jest.fn(),
  } as unknown as jest.Mocked<EntityStoreESQLService>);

export const entityStoreEsqlServiceMock = { create: createEntityStoreEsqlServiceMock };
