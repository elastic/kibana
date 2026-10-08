/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createMockToolContext,
  createSignificantEventsServer,
  invokeHandler,
} from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { searchEventsToolHandler } from './handler';
import { createSearchEventsTool, SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  ...jest.requireActual('./handler'),
  searchEventsToolHandler: jest.fn(),
}));

const createMockTelemetry = () => ({
  trackAgentToolEventSearch: jest.fn(),
});

describe('event_search tool', () => {
  const readerServer = createSignificantEventsServer({ featurePrivilege: 'read' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses expected tool id', () => {
    const tool = createSearchEventsTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: readerServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID);
  });

  it('validates bounded filters and normalizes query', () => {
    const tool = createSearchEventsTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: readerServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(tool.schema.safeParse({ topology_feature_ids: ['checkout-payment'] }).success).toBe(
      true
    );
    expect(
      tool.schema.safeParse({ topology_feature_ids: Array.from({ length: 101 }, (_, i) => `${i}`) })
        .success
    ).toBe(false);
    expect(tool.schema.safeParse({ per_page: 50, rule_uuids: ['rule-1'] }).success).toBe(true);
    expect(tool.schema.safeParse({ per_page: 51, rule_uuids: ['rule-1'] }).success).toBe(false);
    expect(tool.schema.parse({ query: '', rule_uuids: ['rule-1'] }).query).toBeUndefined();
    expect(
      tool.schema.parse({ event_ids: ['event-1'], rule_uuids: [] }).rule_uuids
    ).toBeUndefined();
    expect(tool.schema.parse({ query: '  latency  ' }).query).toBe('latency');
    expect(tool.schema.parse({ rule_uuids: ['rule-uuid-1'] }).status).toBe('active');
    expect(tool.schema.safeParse({ view: 'full', event_ids: ['event-1'] }).success).toBe(true);
    expect(tool.schema.safeParse({ view: 'full', event_ids: ['event-1', 'event-2'] }).success).toBe(
      false
    );
    expect(
      tool.schema.safeParse({ view: 'full', event_ids: ['event-1'], signals_per_page: 11 }).success
    ).toBe(false);
    expect(tool.schema.safeParse({}).success).toBe(true);
    expect(tool.schema.parse({})).toEqual(
      expect.objectContaining({
        status: 'active',
        view: 'compact',
        page: 1,
        per_page: 20,
        from: 'now-7d',
        to: 'now',
      })
    );
  });

  it('returns events on success and tracks telemetry', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (searchEventsToolHandler as jest.Mock).mockResolvedValue({
      events: [{ event_uuid: 'e1' }],
      view: 'compact',
      page: 1,
      total: 1,
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventSearchClient: jest.fn().mockReturnValue({}),
      licensing: {},
      uiSettingsClient: {},
    });
    const telemetry = createMockTelemetry();

    const tool = createSearchEventsTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: readerServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    const result = await invokeHandler(
      tool as never,
      {
        query: '   ',
        stream_names: ['logs.checkout'],
        rule_uuids: ['rule-uuid-1'],
        status: 'active',
      },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
    expect(telemetry.trackAgentToolEventSearch).toHaveBeenCalledWith({
      success: true,
      result_count: 1,
      has_query: false,
      has_stream_filter: true,
      status_filter: 'active',
      view: 'compact',
      page: 1,
    });
    expect(searchEventsToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: undefined,
          rule_uuids: ['rule-uuid-1'],
        }),
      })
    );
  });

  it('accepts cross-stream searches without stream_names', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (searchEventsToolHandler as jest.Mock).mockResolvedValue({
      events: [{ event_uuid: 'e2' }],
      view: 'compact',
      page: 1,
      total: 1,
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventSearchClient: jest.fn().mockReturnValue({}),
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createSearchEventsTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: readerServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });

    const result = await invokeHandler(
      tool as never,
      { query: 'latency', status: 'inactive' },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
  });

  it('does not search without the Nightshift read privilege', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const tool = createSearchEventsTool({
      getScopedClients: jest.fn().mockResolvedValue({
        getEventSearchClient: jest.fn(),
        licensing: {},
      }) as unknown as GetScopedClients,
      server: createSignificantEventsServer({ featurePrivilege: 'none' }),
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });

    const result = await invokeHandler(
      tool as never,
      { status: 'active' },
      createMockToolContext()
    );

    expect(searchEventsToolHandler).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
