/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createMockToolContext, invokeHandler, mockSourcesClient } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import type { SignificantEventsServer } from '../../../types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { eventsWriteHandler } from '../event_write/handler';
import {
  createEventSchema,
  createEventTool,
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
} from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('../../../routes/utils/assert_can_manage_significant_events', () => ({
  assertCanManageSignificantEvents: jest.fn(),
}));

jest.mock('../event_write/handler', () => ({
  eventsWriteHandler: jest.fn(),
}));

describe('event_create tool', () => {
  const telemetry = { trackAgentToolEventCreate: jest.fn() };

  it('uses expected tool id', () => {
    const tool = createEventTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID);
  });

  it('does not let the caller set recovering, which only the status reconciliation writes', () => {
    expect(createEventSchema.shape.status.safeParse('recovering').success).toBe(false);
    expect(createEventSchema.shape.status.safeParse('inactive').success).toBe(true);
  });

  it('returns success result', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
    (eventsWriteHandler as jest.Mock).mockResolvedValue({
      event_uuid: 'e1',
      event_id: 'agent-event-abcd1234',
      status: 'open',
      written: true,
      created: true,
      group_hash: 'hash-1',
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventSearchClient: jest.fn().mockReturnValue({}),
      getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
      sourcesClient: mockSourcesClient(['logs.a']),
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createEventTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    const result = await invokeHandler(
      tool as never,
      {
        title: 'T',
        symptom_hypothesis: 'Requests fail because the upstream dependency is unavailable.',
        summary: 'S',
        slugs: ['logs.a'],
        confidence: 0.8,
      },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
    expect(assertCanManageSignificantEvents).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
  });

  describe('alert identity telemetry', () => {
    const toolInput = {
      title: 'T',
      symptom_hypothesis: 'Requests fail because the upstream dependency is unavailable.',
      summary: 'S',
      slugs: ['logs.a'],
      confidence: 0.8,
    };

    const run = async (trackAgentToolEventCreate = jest.fn()) => {
      const getScopedClients = jest.fn().mockResolvedValue({
        getEventSearchClient: jest.fn().mockReturnValue({}),
        sourcesClient: mockSourcesClient(['logs.a']),
        licensing: {},
      });
      const tool = createEventTool({
        getScopedClients: getScopedClients as unknown as GetScopedClients,
        server: {} as SignificantEventsServer,
        logger: loggingSystemMock.createLogger(),
        telemetry: { trackAgentToolEventCreate } as never,
      });
      const context = createMockToolContext();
      context.request = httpServerMock.createKibanaRequest({ spaceId: 'space-a' });
      const result = await invokeHandler(tool as never, toolInput, context);
      return { payload: trackAgentToolEventCreate.mock.calls[0]?.[0], result };
    };

    beforeEach(() => {
      (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
      (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
    });

    it('reports the created event identity and ignores telemetry failures', async () => {
      (eventsWriteHandler as jest.Mock).mockResolvedValue({
        event_id: 'event-1',
        status: 'active',
        written: true,
        created: true,
        group_hash: 'hash-1',
      });
      const track = jest.fn().mockImplementation(() => {
        throw new Error('telemetry unavailable');
      });

      const { payload, result } = await run(track);

      expect(payload).toEqual({
        alert_source: 'elastic.significant_events',
        space_id: 'space-a',
        fingerprint: 'event-1',
        group_hash: 'hash-1',
        success: true,
        source_ids: ['logs.a'],
      });
      expect(result).toMatchObject({ results: [{ type: 'other' }] });
    });

    it('reports no fingerprint or group_hash when the create fails before persisting', async () => {
      (eventsWriteHandler as jest.Mock).mockRejectedValue(new Error('index unavailable'));

      const { payload } = await run();

      expect(payload).toEqual({
        alert_source: 'elastic.significant_events',
        space_id: 'space-a',
        success: false,
        source_ids: ['logs.a'],
        error_message: 'index unavailable',
      });
    });
  });
});
