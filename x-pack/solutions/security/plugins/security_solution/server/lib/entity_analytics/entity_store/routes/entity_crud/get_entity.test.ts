/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getEntity } from './get_entity';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { GetEntityRequestParams } from '../../../../../../common/api/entity_analytics/entity_store/entities/get_entity.gen';

jest.mock('@kbn/zod-helpers');

describe('getEntity route', () => {
  let router: any;
  let logger: any;

  beforeEach(() => {
    router = httpServerMock.createRouter();
    logger = loggingSystemMock.createLogger();
    (buildRouteValidationWithZod as jest.Mock).mockReturnValue(jest.fn());
  });

  it('should register a GET route with correct path and security', () => {
    getEntity(router, logger);

    expect(router.versioned.get).toHaveBeenCalledWith({
      access: 'public',
      path: '/api/entity_store/entities/{entityType}/{entityId}',
      options: {
        availability: {
          stability: 'beta',
        },
      },
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', 'securitySolution-entity-analytics'],
        },
      },
    });
  });

  it('should validate request params using GetEntityRequestParams schema', () => {
    getEntity(router, logger);

    expect(buildRouteValidationWithZod).toHaveBeenCalledWith(GetEntityRequestParams);
  });

  it('should call addVersion on the router', () => {
    const mockVersionedRoute = {
      addVersion: jest.fn(),
    };
    router.versioned.get.mockReturnValue(mockVersionedRoute);

    getEntity(router, logger);

    expect(mockVersionedRoute.addVersion).toHaveBeenCalled();
  });
});