/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_WORKER_URL_TEMPLATE } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { validateRegisteredBody } from '../test_helpers/validate_registered_body';
import { registerUpdateWorkerRoute } from './update_worker';

const WORKER_ID = 'open_investigation';

/**
 * The route reads nothing but its own request, because there is nothing to read: a worker is projected
 * from the lane's YAML and carries no state a service could write.
 */
const createDeps = () => {
  const router = mockRouter.create();

  return {
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };
};

const getRoute = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('patch', PND_WORKER_URL_TEMPLATE);

const invoke = async (
  deps: ReturnType<typeof createDeps>,
  { body, workerId = WORKER_ID }: { body: Record<string, unknown>; workerId?: string }
) => {
  const handler = getRoute(deps.router).versions['1'].handler;
  const request = httpServerMock.createKibanaRequest({ body, params: { workerId } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerUpdateWorkerRoute', () => {
  it('stays registered on the watch-write privilege, rather than being deleted', () => {
    const deps = createDeps();

    registerUpdateWorkerRoute(deps);

    expect(getRoute(deps.router).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_WRITE] },
    });
  });

  /**
   * The acceptance criterion: a toggle attempt is refused, not silently dropped. Both directions are
   * covered because "turn it off" and "turn it on" are equally meaningless against a projection.
   */
  it.each([true, false])('answers 400 for enabled: %s', async (enabled) => {
    const deps = createDeps();
    registerUpdateWorkerRoute(deps);

    const response = await invoke(deps, { body: { enabled } });

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('names the worker and the reason, so the caller learns there is nothing to toggle', async () => {
    const deps = createDeps();
    registerUpdateWorkerRoute(deps);

    const response = await invoke(deps, { body: { enabled: false } });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: `Cannot update worker "${WORKER_ID}": a worker is a read-only projection of an ai.agent step of a watch, so there is nothing to enable`,
      },
    });
  });

  it('never answers ok, which a caller would read as the flag having been written', async () => {
    const deps = createDeps();
    registerUpdateWorkerRoute(deps);

    const response = await invoke(deps, { body: { enabled: false } });

    expect(response.ok).not.toHaveBeenCalled();
  });

  /**
   * A 404 would read as "wrong id" and invite a retry, so an id that projects nothing is refused the
   * same way as one that projects a real step: the answer is about the ask, not the spelling.
   */
  it('refuses an id no lane declares with the same 400', async () => {
    const deps = createDeps();
    registerUpdateWorkerRoute(deps);

    const response = await invoke(deps, {
      body: { enabled: false },
      workerId: 'alert-correlation',
    });

    expect(response.notFound).not.toHaveBeenCalled();
  });

  /**
   * Validating before refusing is what keeps the message actionable: the caller is told the *thing*
   * cannot be toggled rather than that the body was shaped wrong.
   */
  it('accepts a well-formed body at validation, so the handler refuses the ask itself', () => {
    const deps = createDeps();
    registerUpdateWorkerRoute(deps);

    expect(
      validateRegisteredBody({ body: { enabled: false }, route: getRoute(deps.router) })
    ).toBeUndefined();
  });

  it('rejects a non-boolean enabled at validation', () => {
    const deps = createDeps();
    registerUpdateWorkerRoute(deps);

    expect(
      validateRegisteredBody({ body: { enabled: 'false' }, route: getRoute(deps.router) })
    ).toBeDefined();
  });
});
