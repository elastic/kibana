/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SignificantEventsServer } from '../../../types';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { updateEventStatusToolHandler } from './handler';
import {
  createEventStatusUpdateTool,
  eventStatusUpdateSchema,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
} from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('../../../routes/utils/assert_can_manage_significant_events', () => ({
  assertCanManageSignificantEvents: jest.fn(),
}));

jest.mock('./handler', () => ({
  updateEventStatusToolHandler: jest.fn(),
}));

describe('event_status_update tool', () => {
  const telemetry = { trackAgentToolEventStatusUpdate: jest.fn() };

  it('uses expected tool id', () => {
    const tool = createEventStatusUpdateTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID);
  });

  it('does not let the caller set recovering, which only the status reconciliation writes', () => {
    expect(eventStatusUpdateSchema.shape.status.safeParse('recovering').success).toBe(false);
    expect(eventStatusUpdateSchema.shape.status.safeParse('inactive').success).toBe(true);
  });

  it('returns success result', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
    (updateEventStatusToolHandler as jest.Mock).mockResolvedValue({
      event_id: 'e1',
      updated: 1,
      ignored: 0,
      status: 'inactive',
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventSearchClient: jest.fn().mockReturnValue({}),
      getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createEventStatusUpdateTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    const result = await invokeHandler(
      tool as never,
      { event_id: 'e1', status: 'inactive', assessment_note: 'Recovered after rollback' },
      createMockToolContext()
    );
    expect(updateEventStatusToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({ assessmentNote: 'Recovered after rollback' })
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
    expect(assertCanManageSignificantEvents).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
  });

  describe('alert identity telemetry', () => {
    const run = async (trackAgentToolEventStatusUpdate = jest.fn()) => {
      const getScopedClients = jest.fn().mockResolvedValue({
        getEventSearchClient: jest.fn().mockReturnValue({}),
        licensing: {},
      });
      const tool = createEventStatusUpdateTool({
        getScopedClients: getScopedClients as unknown as GetScopedClients,
        server: {} as SignificantEventsServer,
        logger: loggingSystemMock.createLogger(),
        telemetry: { trackAgentToolEventStatusUpdate } as never,
      });
      const context = createMockToolContext();
      context.request = httpServerMock.createKibanaRequest({ spaceId: 'space-a' });
      const result = await invokeHandler(
        tool as never,
        { event_id: 'event-1', status: 'inactive' },
        context
      );
      return { payload: trackAgentToolEventStatusUpdate.mock.calls[0]?.[0], result };
    };

    const identity = {
      alert_source: 'elastic.significant_events',
      fingerprint: 'event-1',
      space_id: 'space-a',
    };

    beforeEach(() => {
      (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
      (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
    });

    it('reports the updated event identity and ignores telemetry failures', async () => {
      (updateEventStatusToolHandler as jest.Mock).mockResolvedValue({
        event_id: 'event-1',
        updated: 1,
        ignored: 0,
        status: 'inactive',
      });
      const track = jest.fn().mockImplementation(() => {
        throw new Error('telemetry unavailable');
      });

      const { payload, result } = await run(track);

      expect(payload).toEqual({
        ...identity,
        success: true,
        event_id: 'event-1',
        status: 'inactive',
      });
      expect(result).toMatchObject({ results: [{ type: 'other' }] });
    });

    it.each([
      ['not_found', false],
      ['already_in_state', true],
      ['not_a_breach', true],
      ['superseded', false],
    ] as const)('reports an ignored %s update with success=%s', async (reason, success) => {
      (updateEventStatusToolHandler as jest.Mock).mockResolvedValue({
        event_id: 'event-1',
        updated: 0,
        ignored: 1,
        status: 'inactive',
        reason,
      });

      const { payload } = await run();

      expect(payload).toEqual({
        ...identity,
        success,
        event_id: 'event-1',
        status: 'inactive',
      });
    });

    it('keeps the caller-named event as fingerprint when the update fails', async () => {
      (updateEventStatusToolHandler as jest.Mock).mockRejectedValue(new Error('index unavailable'));

      const { payload } = await run();

      expect(payload).toEqual({
        ...identity,
        success: false,
        event_id: 'event-1',
        status: 'inactive',
        error_message: 'index unavailable',
      });
    });
  });
});
