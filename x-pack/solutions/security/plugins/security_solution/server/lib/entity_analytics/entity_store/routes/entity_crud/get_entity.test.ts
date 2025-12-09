/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getEntity } from './get_entity';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  GetEntityRequestParams,
  GetEntityRequestBody,
} from '../../../../../../common/api/entity_analytics/entity_store/entities/get_entity.gen';

jest.mock('@kbn/zod-helpers');

describe('getEntity route', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    (buildRouteValidationWithZod as jest.Mock).mockReturnValue(jest.fn());
  });

  it('should register a POST route with correct path and security', () => {
    getEntity(router, logger);

    expect(router.versioned.post).toHaveBeenCalledWith({
      access: 'public',
      path: '/api/entity_store/entities/{entityType}',
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

  it('should validate request params and body using GetEntityRequestParams and GetEntityRequestBody schemas', () => {
    getEntity(router, logger);

    expect(buildRouteValidationWithZod).toHaveBeenCalledWith(GetEntityRequestParams);
    expect(buildRouteValidationWithZod).toHaveBeenCalledWith(GetEntityRequestBody);
  });

  it('should call addVersion on the router', () => {
    const mockVersionedRoute = {
      addVersion: jest.fn(),
    };
    router.versioned.post.mockReturnValue(mockVersionedRoute);

    getEntity(router, logger);

    expect(mockVersionedRoute.addVersion).toHaveBeenCalled();
  });
});
