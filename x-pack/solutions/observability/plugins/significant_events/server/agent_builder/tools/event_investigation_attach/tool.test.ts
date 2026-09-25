/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      event_uuid: 'event-uuid',
      updated: 1,
      ignored: 0,
    });

    const logger = loggingSystemMock.createLogger();
    const tool = createEventInvestigationAttachTool({
      getScopedClients: jest.fn().mockResolvedValue({
        getEventClient: jest.fn().mockResolvedValue({}),
        getEventSearchClient: jest.fn().mockResolvedValue({}),
        getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
        licensing: {},
      }) as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger,
      telemetry: { trackAgentToolEventInvestigationAttach: jest.fn() } as never,
    });

    await invokeHandler(
      tool as never,
      {
        event_id: 'agent-event-1',
        workflow_execution_id: 'workflow-id',
        started_at: '2026-01-01T00:00:00.000Z',
      },
      createMockToolContext()
    );

    expect(assertCanManageSignificantEvents).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
    expect(attachEventInvestigationToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({ logger })
    );
  });
});
