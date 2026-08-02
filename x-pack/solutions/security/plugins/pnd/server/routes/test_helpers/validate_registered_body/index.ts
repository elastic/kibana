/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AddVersionOpts,
  RouteValidationError,
  type RouteValidationResultFactory,
} from '@kbn/core-http-server';

/** The mocked-versioned-route shape `mockRouter.create().versioned.getRoute(...)` returns. */
export interface RegisteredVersions {
  versions: Record<string, { config: AddVersionOpts<unknown, unknown, unknown> }>;
}

/**
 * Run the request-body validation a route **actually registered**, and report which branch fired.
 *
 * This exists because `httpServerMock.createKibanaRequest({ body })` does **not** validate: it hands
 * the body straight to the handler. So a handler-level test can never prove "this route rejects a
 * malformed body with a 400" — the assertion security finding D2 and the tuning allow-list both turn
 * on. Reading the registered validator and running it is the closest a unit test gets to the real
 * request path, because it is the same function Kibana's request validator calls, with the same
 * result factory contract.
 *
 * Returns `undefined` when the body is accepted, and the {@link RouteValidationError} Kibana would
 * turn into a `400` when it is rejected.
 */
export const validateRegisteredBody = ({
  body,
  route,
  version = '1',
}: {
  body: unknown;
  route: RegisteredVersions;
  version?: string;
}): RouteValidationError | undefined => {
  const registered = route.versions[version];
  if (registered == null) {
    throw new Error(`No version "${version}" is registered for this route`);
  }

  const { validate } = registered.config;
  const resolved = typeof validate === 'function' ? validate() : validate;
  const validateBody = resolved === false ? undefined : resolved?.request?.body;

  if (typeof validateBody !== 'function') {
    throw new Error('This route does not register a request-body validation function');
  }

  const resultFactory: RouteValidationResultFactory = {
    badRequest: (error, path) => ({ error: new RouteValidationError(error, path) }),
    ok: (value) => ({ value }),
  };

  const result = validateBody(body, resultFactory);

  return 'error' in result ? result.error : undefined;
};
