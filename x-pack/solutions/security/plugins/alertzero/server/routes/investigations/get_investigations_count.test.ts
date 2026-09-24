/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';
import { registerGetInvestigationsCountRoute } from './get_investigations_count';

const makeDeps = (listFn: jest.Mock) => {
  const addVersion = jest.fn();
  const router = {
    versioned: {
      get: jest.fn().mockReturnValue({ addVersion }),
    },
  };

  const scopedClient = { search: listFn };
  const conversations = {
    getScopedClient: jest.fn().mockResolvedValue(scopedClient),
  };
  const logger = loggingSystemMock.createLogger();

  registerGetInvestigationsCountRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getAgentBuilderConversations: () => conversations,
  } as unknown as RouteDependencies);

  const routeConfig = router.versioned.get.mock.calls[0][0];
  const handler = addVersion.mock.calls[0][1] as (
    context: unknown,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;

  return { handler, routeConfig, conversations, scopedClient, logger };
};

describe('registerGetInvestigationsCountRoute', () => {
  it('requires only ALERTZERO_API_PRIVILEGE_READ (no agent_builder privilege)', () => {
    const { routeConfig } = makeDeps(jest.fn());
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('calls client.search with the investigation template_id filter and perPage 1', async () => {
    const list = jest.fn().mockResolvedValue({ results: [], total: 0 });
    const { handler, conversations } = makeDeps(list);
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await handler({}, request, response);

    expect(conversations.getScopedClient).toHaveBeenCalledWith({ request });
    expect(list).toHaveBeenCalledWith({
      filter: `template_id: "${TEMPLATE_ID_INVESTIGATION}"`,
      perPage: 1,
    });
  });

  it('returns { total } from the list response', async () => {
    const list = jest.fn().mockResolvedValue({ results: [], total: 7 });
    const { handler } = makeDeps(list);
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: { total: 7 } });
  });

  it('logs the error and returns a generic 500 when the client throws', async () => {
    const list = jest.fn().mockRejectedValue(new Error('ES unavailable'));
    const { handler, logger } = makeDeps(list);
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to count'));
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to count investigations' },
    });
  });
});
