/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import { attachEventInvestigationToolHandler } from './handler';
import { createEventInvestigationAttachTool } from './tool';

jest.mock('../../../routes/utils/assert_can_manage_significant_events', () => ({
  assertCanManageSignificantEvents: jest.fn(),
}));

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  attachEventInvestigationToolHandler: jest.fn(),
}));

describe('event_investigation_attach tool', () => {
  it('requires manage privilege and passes its logger to the handler', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
    (attachEventInvestigationToolHandler as jest.Mock).mockResolvedValue({
      updated: 1,
      ignored: 0,
    });

    const logger = loggingSystemMock.createLogger();
    const telemetry = { trackAgentToolEventInvestigationAttach: jest.fn() };
    const tool = createEventInvestigationAttachTool({
      getScopedClients: jest.fn().mockResolvedValue({
        getEventSearchClient: jest.fn().mockResolvedValue({}),
        getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
        licensing: {},
      }) as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger,
      telemetry: telemetry as never,
    });

    const context = createMockToolContext();
    context.workflowExecutionId = 'attaching-workflow-id';
    await invokeHandler(
      tool as never,
      {
        event_id: 'agent-event-1',
        workflow_execution_id: 'workflow-id',
        started_at: '2026-01-01T00:00:00.000Z',
      },
      context
    );

    expect(assertCanManageSignificantEvents).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
    expect(attachEventInvestigationToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
        investigationWorkflowExecutionId: 'workflow-id',
        workflowExecutionId: 'attaching-workflow-id',
      })
    );
    expect(telemetry.trackAgentToolEventInvestigationAttach).toHaveBeenCalledWith({
      alert_source: 'elastic.significant_events',
      fingerprint: 'agent-event-1',
      space_id: 'default',
      success: true,
      event_id: 'agent-event-1',
      workflow_execution_id: 'attaching-workflow-id',
      investigation_id: 'workflow-id',
    });
  });

  describe('alert identity telemetry', () => {
    const params = {
      event_id: 'event-1',
      workflow_execution_id: 'workflow-id',
      started_at: '2026-01-01T00:00:00.000Z',
    };

    const identity = {
      alert_source: 'elastic.significant_events',
      fingerprint: 'event-1',
      space_id: 'space-a',
    };

    const run = async (trackAgentToolEventInvestigationAttach = jest.fn()) => {
      const tool = createEventInvestigationAttachTool({
        getScopedClients: jest.fn().mockResolvedValue({
          getEventSearchClient: jest.fn().mockResolvedValue({}),
          getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
          licensing: {},
        }) as unknown as GetScopedClients,
        server: {} as SignificantEventsServer,
        logger: loggingSystemMock.createLogger(),
        telemetry: { trackAgentToolEventInvestigationAttach } as never,
      });
      const context = createMockToolContext();
      context.request = httpServerMock.createKibanaRequest({ spaceId: 'space-a' });
      const result = await invokeHandler(tool as never, params, context);
      return { payload: trackAgentToolEventInvestigationAttach.mock.calls[0]?.[0], result };
    };

    beforeEach(() => {
      (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
      (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
    });

    it('reports the attached event identity and ignores telemetry failures', async () => {
      (attachEventInvestigationToolHandler as jest.Mock).mockResolvedValue({
        updated: 1,
        ignored: 0,
      });
      const track = jest.fn().mockImplementation(() => {
        throw new Error('telemetry unavailable');
      });

      const { payload, result } = await run(track);

      expect(payload).toEqual({
        ...identity,
        success: true,
        event_id: 'event-1',
        investigation_id: 'workflow-id',
      });
      expect(result).toMatchObject({ results: [{ type: 'other' }] });
    });

    it('keeps the caller-named event as fingerprint when the attach fails', async () => {
      (attachEventInvestigationToolHandler as jest.Mock).mockRejectedValue(
        new Error('index unavailable')
      );

      const { payload } = await run();

      expect(payload).toEqual({
        ...identity,
        success: false,
        event_id: 'event-1',
        investigation_id: 'workflow-id',
        error_message: 'index unavailable',
      });
    });
  });
});
