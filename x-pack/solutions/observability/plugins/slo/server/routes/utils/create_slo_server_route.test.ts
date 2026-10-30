/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultRouteCreateOptions,
  ServerRouteRepository,
} from '@kbn/server-route-repository-utils';
import {
  SLOError,
  SLOIdConflict,
  SLONotFound,
  SLOOperationTimeout,
  SLOTemplateNotFound,
  SecurityException,
} from '../../errors';
import { createSloServerRoute, handleSLOError } from './create_slo_server_route';

const getRouteOptions = (route: ServerRouteRepository[string]): DefaultRouteCreateOptions =>
  'options' in route ? route.options : {};

const ENDPOINT = 'GET /api/observability/slos 2023-10-31';

describe('createSloServerRoute', () => {
  const security = {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  };

  it('tags the route with the slo OpenAPI tag', () => {
    const routes = createSloServerRoute({
      endpoint: ENDPOINT,
      options: { access: 'public' },
      security,
      handler: jest.fn(),
    });

    expect(getRouteOptions(routes[ENDPOINT])).toEqual({ access: 'public', tags: ['oas-tag:slo'] });
  });

  it('keeps the tags already set on the route', () => {
    const routes = createSloServerRoute({
      endpoint: ENDPOINT,
      options: { access: 'public', tags: ['existing'] },
      security,
      handler: jest.fn(),
    });

    expect(getRouteOptions(routes[ENDPOINT]).tags).toEqual(['existing', 'oas-tag:slo']);
  });
});

describe('handleSLOError', () => {
  it.each([
    [new SLONotFound('not found'), 404],
    [new SLOTemplateNotFound('template not found'), 404],
    [new SLOIdConflict('conflict'), 409],
    [new SecurityException('forbidden'), 403],
    [new SLOOperationTimeout('timeout'), 503],
    [new SLOError('bad request'), 400],
  ])('maps %p to a %p response', (error, statusCode) => {
    const boom = handleSLOError(error);

    expect(boom.output.statusCode).toBe(statusCode);
    expect(boom.message).toBe(error.message);
  });
});
