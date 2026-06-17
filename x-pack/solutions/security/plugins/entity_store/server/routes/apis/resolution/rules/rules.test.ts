/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../telemetry/traces', () => ({
  runWithSpan: ({ cb }: { cb: () => unknown }) => cb(),
}));

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStorePluginRouter } from '../../../../types';
import { ENTITY_STORE_ROUTES } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import { registerResolutionRulesList } from './list';
import { registerResolutionRulesEnable } from './enable';
import { registerResolutionRulesDisable } from './disable';

interface CapturedRoute {
  routeConfig: { path: string; security?: { authz?: unknown } };
  handler?: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;
}

const createFakeRouter = () => {
  const calls: { get: CapturedRoute[]; put: CapturedRoute[] } = { get: [], put: [] };
  const make = (method: 'get' | 'put') => (routeConfig: CapturedRoute['routeConfig']) => {
    const entry: CapturedRoute = { routeConfig };
    calls[method].push(entry);
    const versioned = {
      addVersion: (_v: unknown, handler: CapturedRoute['handler']) => {
        entry.handler = handler;
        return versioned;
      },
    };
    return versioned;
  };
  const router = { versioned: { get: make('get'), put: make('put') } };
  return { router: router as unknown as EntityStorePluginRouter, calls };
};

const createCtx = (
  overridesClient: unknown,
  { enterprise = true }: { enterprise?: boolean } = {}
) => ({
  entityStore: Promise.resolve({
    logger: loggingSystemMock.createLogger(),
    featureFlags: { isEntityStoreV2Enabled: jest.fn().mockResolvedValue(true) },
    resolutionRuleOverridesClient: overridesClient,
    namespace: 'default',
  }),
  licensing: Promise.resolve({
    license: { hasAtLeast: (tier: string) => enterprise || tier !== 'enterprise' },
  }),
});

const createReq = (params: Record<string, string> = {}, method = 'get') => ({
  route: { path: '/test', method },
  params,
});

describe('resolution rules routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('registers a public GET with the resolution permissions', () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesList(router);
      expect(calls.get[0].routeConfig.path).toBe(ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_LIST);
      expect(calls.get[0].routeConfig.security?.authz).toEqual(RESOLUTION_ENTITY_STORE_PERMISSIONS);
    });

    it('returns the rule config array with managed: true and override-aware enabled', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesList(router);

      const overridesClient = {
        find: jest.fn().mockResolvedValue({ overrides: { email_exact_match: { enabled: false } } }),
      };
      const res = httpServerMock.createResponseFactory();
      await calls.get[0].handler!(createCtx(overridesClient), createReq(), res);

      expect(res.ok).toHaveBeenCalledWith({
        body: {
          rules: [
            {
              id: 'email_exact_match',
              description: 'Email exact match across identity providers',
              enabled: false,
              managed: true,
            },
          ],
        },
      });
    });

    it('defaults enabled to true when no override exists', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesList(router);

      const overridesClient = { find: jest.fn().mockResolvedValue(undefined) };
      const res = httpServerMock.createResponseFactory();
      await calls.get[0].handler!(createCtx(overridesClient), createReq(), res);

      expect(res.ok).toHaveBeenCalledWith({
        body: {
          rules: [
            expect.objectContaining({ id: 'email_exact_match', enabled: true, managed: true }),
          ],
        },
      });
    });

    it('is gated to enterprise license (403 below enterprise, handler not reached)', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesList(router);

      const overridesClient = { find: jest.fn() };
      const res = httpServerMock.createResponseFactory();
      // The real response factory returns a truthy IKibanaResponse, which is how
      // wrapMiddlewares short-circuits; the mock must mirror that.
      res.forbidden.mockReturnValue({ status: 403 } as never);
      await calls.get[0].handler!(
        createCtx(overridesClient, { enterprise: false }),
        createReq(),
        res
      );

      expect(res.forbidden).toHaveBeenCalled();
      expect(overridesClient.find).not.toHaveBeenCalled();
      expect(res.ok).not.toHaveBeenCalled();
    });
  });

  describe('enable', () => {
    it('registers a public PUT at the enable path', () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesEnable(router);
      expect(calls.put[0].routeConfig.path).toBe(
        ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_ENABLE
      );
    });

    it('enables a known rule and returns 200', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesEnable(router);

      const overridesClient = { setEnabled: jest.fn().mockResolvedValue({ overrides: {} }) };
      const res = httpServerMock.createResponseFactory();
      await calls.put[0].handler!(
        createCtx(overridesClient),
        createReq({ id: 'email_exact_match' }, 'put'),
        res
      );

      expect(overridesClient.setEnabled).toHaveBeenCalledWith('email_exact_match', true);
      expect(res.ok).toHaveBeenCalledWith({ body: { id: 'email_exact_match', enabled: true } });
    });

    it('returns 404 for an unknown rule id without touching the SO', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesEnable(router);

      const overridesClient = { setEnabled: jest.fn() };
      const res = httpServerMock.createResponseFactory();
      // The real response factory returns a truthy IKibanaResponse, which is how
      // the handler short-circuits on an unknown rule; the mock must mirror that.
      res.notFound.mockReturnValue({ status: 404 } as never);
      await calls.put[0].handler!(
        createCtx(overridesClient),
        createReq({ id: 'nonexistent_rule' }, 'put'),
        res
      );

      expect(overridesClient.setEnabled).not.toHaveBeenCalled();
      expect(res.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('is not defined') },
      });
    });

    it('is gated to enterprise license (403 below enterprise, SO untouched)', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesEnable(router);

      const overridesClient = { setEnabled: jest.fn() };
      const res = httpServerMock.createResponseFactory();
      res.forbidden.mockReturnValue({ status: 403 } as never);
      await calls.put[0].handler!(
        createCtx(overridesClient, { enterprise: false }),
        createReq({ id: 'email_exact_match' }, 'put'),
        res
      );

      expect(res.forbidden).toHaveBeenCalled();
      expect(overridesClient.setEnabled).not.toHaveBeenCalled();
      expect(res.ok).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('registers a public PUT at the disable path', () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesDisable(router);
      expect(calls.put[0].routeConfig.path).toBe(
        ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_DISABLE
      );
    });

    it('disables a known rule and returns 200', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesDisable(router);

      const overridesClient = {
        setEnabled: jest
          .fn()
          .mockResolvedValue({ overrides: { email_exact_match: { enabled: false } } }),
      };
      const res = httpServerMock.createResponseFactory();
      await calls.put[0].handler!(
        createCtx(overridesClient),
        createReq({ id: 'email_exact_match' }, 'put'),
        res
      );

      expect(overridesClient.setEnabled).toHaveBeenCalledWith('email_exact_match', false);
      expect(res.ok).toHaveBeenCalledWith({ body: { id: 'email_exact_match', enabled: false } });
    });

    it('returns 404 for an unknown rule id without touching the SO', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesDisable(router);

      const overridesClient = { setEnabled: jest.fn() };
      const res = httpServerMock.createResponseFactory();
      // The real response factory returns a truthy IKibanaResponse, which is how
      // the handler short-circuits on an unknown rule; the mock must mirror that.
      res.notFound.mockReturnValue({ status: 404 } as never);
      await calls.put[0].handler!(
        createCtx(overridesClient),
        createReq({ id: 'nonexistent_rule' }, 'put'),
        res
      );

      expect(overridesClient.setEnabled).not.toHaveBeenCalled();
      expect(res.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('is not defined') },
      });
    });

    it('is gated to enterprise license (403 below enterprise, SO untouched)', async () => {
      const { router, calls } = createFakeRouter();
      registerResolutionRulesDisable(router);

      const overridesClient = { setEnabled: jest.fn() };
      const res = httpServerMock.createResponseFactory();
      res.forbidden.mockReturnValue({ status: 403 } as never);
      await calls.put[0].handler!(
        createCtx(overridesClient, { enterprise: false }),
        createReq({ id: 'email_exact_match' }, 'put'),
        res
      );

      expect(res.forbidden).toHaveBeenCalled();
      expect(overridesClient.setEnabled).not.toHaveBeenCalled();
      expect(res.ok).not.toHaveBeenCalled();
    });
  });
});
