/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { SignificantEventsServer } from '../../../types';
import { DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE } from '@kbn/nightshift-ai';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import {
  createSearchKnowledgeIndicatorsTool,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
} from './tool';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanReadSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('../../../routes/utils/assert_can_manage_significant_events', () => ({
  assertCanReadSignificantEvents: jest.fn(),
}));

describe('ki_search tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as unknown as SignificantEventsServer;
  const request = {} as unknown as KibanaRequest;
  const uiSettings = {} as unknown as IUiSettingsClient;

  it('uses the expected tool id', () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID);
    expect(tool.id).toBe('platform.sig_events.ki_search');
  });

  it('accepts typed filters and pagination', () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger,
    });
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(
      tool.schema.safeParse({
        kind: ['query'],
        stream_names: ['logs.test'],
        query_types: ['match'],
        query_ids: ['query-1'],
        rule_ids: ['rule-1'],
        rule_backed: true,
        page: 2,
        per_page: 50,
      }).success
    ).toBe(true);
    expect(tool.schema.safeParse({ per_page: 101 }).success).toBe(false);
    expect(tool.schema.safeParse({ feature_types: ['unsupported'] }).success).toBe(false);

    const defaults = tool.schema.safeParse({});
    expect(defaults.success).toBe(true);
    if (defaults.success) {
      expect(defaults.data.per_page).toBe(DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE);
    }
  });

  it('availability returns available when access check succeeds', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValueOnce(undefined);

    const getScopedClients = jest.fn(async () => {
      return { licensing: {}, uiSettingsClient: {} } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger,
    });

    const res = await tool.availability!.handler({ request, uiSettings, spaceId: 'default' });
    expect(res).toEqual({ status: 'available' });
  });

  it('availability returns unavailable when access check throws', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockRejectedValueOnce(new Error('nope'));

    const getScopedClients = jest.fn(async () => {
      return { licensing: {}, uiSettingsClient: {} } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger,
    });

    const res = await tool.availability!.handler({ request, uiSettings, spaceId: 'default' });
    expect(res.status).toBe('unavailable');
  });

  it('does not search KIs without the Nightshift read privilege', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (assertCanReadSignificantEvents as jest.Mock).mockRejectedValueOnce(Boom.forbidden());
    const getKnowledgeIndicatorClient = jest.fn();
    const getScopedClients = jest.fn(async () => {
      return { licensing: {}, getKnowledgeIndicatorClient } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createSearchKnowledgeIndicatorsTool({ getScopedClients, server, logger });

    const result = await invokeHandler(tool as never, {}, createMockToolContext());

    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
