/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import {
  ALERTZERO_WORKER_ATTACH_RULES_URL_TEMPLATE,
  SYSTEM_SECURITY_WORKER_IDS_WITH_RULE_ATTACHMENT,
} from '@kbn/alertzero-common';
import { registerRoutes } from './register_routes';
import { createRouteContextMock } from './route_context.mock';

/**
 * Routes that deliberately answer 200 with a typed outcome instead of 403/404 when AlertZero is off
 * or unlicensed, and that are authorized on another solution's privilege instead of an AlertZero
 * one. The attach route is called as the user who created a detection rule, who can edit rules but
 * may hold no AlertZero privilege, and its caller must tell "AlertZero is off, nothing to do" from a
 * failure. Anything added here must say why, and gets its own gate test.
 */
const OUTCOME_GATED_ROUTE_PATHS: readonly string[] = [ALERTZERO_WORKER_ATTACH_RULES_URL_TEMPLATE];

const setup = () => {
  const router = httpServiceMock.createRouter();
  const service = jest.fn((): never => {
    throw new Error('Feature services must not run');
  });
  registerRoutes({
    router,
    logger: loggerMock.create(),
    getSpaceId: service,
    getWatchesService: service,
    getWorkersService: service,
    getConversationProposalsService: service,
    getActionsService: service,
    getAgentBuilderConversations: service,
    getHuntServices: service,
    getScanFailuresService: service,
  });
  const routes = (['get', 'post', 'put', 'patch', 'delete'] as const).flatMap((method) =>
    router.versioned[method].mock.calls.map(([{ path }]) => ({
      path,
      ...router.versioned.getRoute(method, path),
    }))
  );
  const gatedRoutes = routes.filter(({ path }) => !OUTCOME_GATED_ROUTE_PATHS.includes(path));
  const outcomeGatedRoutes = routes.filter(({ path }) => OUTCOME_GATED_ROUTE_PATHS.includes(path));
  return { routes: gatedRoutes, outcomeGatedRoutes, service };
};

describe('AlertZero route gate coverage', () => {
  it.each(['license', 'serverless_tier', 'loading'] as const)(
    'blocks every registered route for %s',
    async (subscription) => {
      const { routes, service } = setup();
      expect(routes.length).toBeGreaterThan(0);
      for (const { versions } of routes) {
        for (const { handler } of Object.values(versions)) {
          const response = httpServerMock.createResponseFactory();
          await handler(
            createRouteContextMock({ subscription }),
            httpServerMock.createKibanaRequest(),
            response
          );
          expect(response.forbidden).toHaveBeenCalled();
        }
      }
      expect(service).not.toHaveBeenCalled();
    }
  );

  it('blocks every registered route when the space setting is off', async () => {
    const { routes, service } = setup();
    for (const { versions } of routes) {
      for (const { handler } of Object.values(versions)) {
        const response = httpServerMock.createResponseFactory();
        await handler(
          createRouteContextMock({ settingEnabled: false }),
          httpServerMock.createKibanaRequest(),
          response
        );
        expect(response.notFound).toHaveBeenCalled();
      }
    }
    expect(service).not.toHaveBeenCalled();
  });

  it('registers exactly the routes that are exempt from the 403/404 gate', () => {
    const { outcomeGatedRoutes } = setup();
    expect(outcomeGatedRoutes.map(({ path }) => path)).toEqual(OUTCOME_GATED_ROUTE_PATHS);
  });

  it.each([
    { name: 'the space setting is off', context: { settingEnabled: false } },
    { name: 'the license is not enough', context: { subscription: 'license' as const } },
    { name: 'the subscription is loading', context: { subscription: 'loading' as const } },
    { name: 'dependencies are unavailable', context: { hasRequiredDependencies: false } },
  ])(
    'the outcome-gated routes report worker_unavailable instead of an error when $name',
    async ({ context }) => {
      const { outcomeGatedRoutes, service } = setup();
      for (const { versions } of outcomeGatedRoutes) {
        for (const { handler } of Object.values(versions)) {
          const response = httpServerMock.createResponseFactory();
          await handler(
            createRouteContextMock(context),
            httpServerMock.createKibanaRequest({
              params: { workerId: SYSTEM_SECURITY_WORKER_IDS_WITH_RULE_ATTACHMENT[0] },
              body: { ruleIds: ['r1'] },
            }),
            response
          );
          expect(response.ok).toHaveBeenCalledWith({ body: { outcome: 'worker_unavailable' } });
          expect(response.forbidden).not.toHaveBeenCalled();
          expect(response.notFound).not.toHaveBeenCalled();
        }
      }
      expect(service).not.toHaveBeenCalled();
    }
  );

  it('authorizes the outcome-gated routes on rule write access', () => {
    for (const { config } of setup().outcomeGatedRoutes) {
      expect(config.security?.authz).toEqual(
        expect.objectContaining({ requiredPrivileges: [RULES_API_ALL] })
      );
    }
  });

  it('requires an AlertZero read or write privilege on every route', () => {
    for (const { config } of setup().routes) {
      expect(config.security?.authz).toEqual(
        expect.objectContaining({
          requiredPrivileges: expect.arrayContaining([
            expect.stringMatching(/^alertzero_(read|write)$/),
          ]),
        })
      );
    }
  });
});
