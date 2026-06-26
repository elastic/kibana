/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { getCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

const ENDPOINT = 'GET /api/observability/slo_composites/{id} 2023-10-31';

describe('createCompositeSloServerRoute', () => {
  const createRouteHandler = () => {
    const innerHandler = jest.fn().mockResolvedValue({ ok: true });
    const routes = createCompositeSloServerRoute({
      endpoint: ENDPOINT,
      options: { access: 'public' },
      security: {
        authz: {
          requiredPrivileges: ['slo_read'],
        },
      },
      params: getCompositeSLOParamsSchema,
      handler: innerHandler,
    });

    return {
      innerHandler,
      handler: routes[ENDPOINT].handler,
    };
  };

  it('returns 404 when the composite SLO feature flag is disabled', async () => {
    const { innerHandler, handler } = createRouteHandler();

    await expect(
      handler({
        request: {},
        context: {
          core: Promise.resolve({
            featureFlags: {
              getBooleanValue: jest.fn().mockResolvedValue(false),
            },
          }),
        },
        plugins: {
          licensing: {
            start: jest.fn(),
          },
        },
      } as never)
    ).rejects.toMatchObject({ output: { statusCode: 404 } });

    expect(innerHandler).not.toHaveBeenCalled();
  });

  it('returns 403 when the license check fails', async () => {
    const { innerHandler, handler } = createRouteHandler();

    await expect(
      handler({
        request: {},
        context: {
          core: Promise.resolve({
            featureFlags: {
              getBooleanValue: jest.fn().mockResolvedValue(true),
            },
          }),
        },
        plugins: {
          licensing: {
            start: jest.fn().mockResolvedValue({
              getLicense: jest.fn().mockResolvedValue({
                hasAtLeast: jest.fn().mockReturnValue(false),
              }),
            }),
          },
        },
      } as never)
    ).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(innerHandler).not.toHaveBeenCalled();
  });

  it('runs the route handler when feature flag and license checks pass', async () => {
    const { innerHandler, handler } = createRouteHandler();

    await expect(
      handler({
        request: {},
        context: {
          core: Promise.resolve({
            featureFlags: {
              getBooleanValue: jest.fn().mockResolvedValue(true),
            },
          }),
        },
        plugins: {
          licensing: {
            start: jest.fn().mockResolvedValue({
              getLicense: jest.fn().mockResolvedValue({
                hasAtLeast: jest.fn().mockReturnValue(true),
              }),
            }),
          },
        },
      } as never)
    ).resolves.toEqual({ ok: true });

    expect(innerHandler).toHaveBeenCalledTimes(1);
  });
});

describe('composite SLO route enforcement', () => {
  interface RouteHandler {
    handler: (ctx: never) => Promise<unknown>;
  }

  const routeFiles = fs
    .readdirSync(__dirname)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.test.ts') &&
        file !== 'create_composite_slo_server_route.ts'
    );

  const discoveredRoutes: Array<{ endpoint: string; handler: (ctx: never) => Promise<unknown> }> =
    [];

  beforeAll(async () => {
    for (const file of routeFiles) {
      const mod = (await import(path.join(__dirname, file.replace(/\.ts$/, '')))) as Record<
        string,
        Record<string, RouteHandler>
      >;

      for (const exported of Object.values(mod)) {
        if (typeof exported !== 'object' || exported === null) continue;

        for (const [endpoint, routeDef] of Object.entries(exported)) {
          if (
            /^(GET|POST|PUT|DELETE|PATCH) /.test(endpoint) &&
            typeof routeDef?.handler === 'function'
          ) {
            discoveredRoutes.push({ endpoint, handler: routeDef.handler });
          }
        }
      }
    }
  });

  it('discovers a route handler in every composite SLO route file', () => {
    expect(discoveredRoutes.length).toBeGreaterThanOrEqual(routeFiles.length);
  });

  const guardNotEnforced = jest
    .fn()
    .mockRejectedValue(
      new Error(
        'getScopedClients was called before the access guards ran — use createCompositeSloServerRoute'
      )
    );

  it('every route returns 404 when the composite SLO feature flag is disabled', async () => {
    for (const { handler } of discoveredRoutes) {
      await expect(
        handler({
          request: {},
          context: {
            core: Promise.resolve({
              featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(false) },
            }),
          },
          plugins: { licensing: { start: jest.fn() } },
          getScopedClients: guardNotEnforced,
        } as never)
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
    }
  });

  it('every route returns 403 when the platinum license check fails', async () => {
    for (const { handler } of discoveredRoutes) {
      await expect(
        handler({
          request: {},
          context: {
            core: Promise.resolve({
              featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
            }),
          },
          plugins: {
            licensing: {
              start: jest.fn().mockResolvedValue({
                getLicense: jest.fn().mockResolvedValue({
                  hasAtLeast: jest.fn().mockReturnValue(false),
                }),
              }),
            },
          },
          getScopedClients: guardNotEnforced,
        } as never)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
    }
  });
});
