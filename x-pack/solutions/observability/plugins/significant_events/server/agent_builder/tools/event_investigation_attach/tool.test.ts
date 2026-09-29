/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import { attachEventInvestigationToolHandler } from './handler';
import { createEventInvestigationAttachTool } from './tool';

vi.mock('../../../routes/utils/assert_can_manage_significant_events', () => {
      const mocked = {
      assertCanManageSignificantEvents: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../routes/utils/assert_significant_events_access', () => {
      const mocked = {
      assertSignificantEventsAccess: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./handler', () => {
      const mocked = {
      attachEventInvestigationToolHandler: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('event_investigation_attach tool', () => {
  it('requires manage privilege and passes its logger to the handler', async () => {
    (assertSignificantEventsAccess as Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as Mock).mockResolvedValue(undefined);
    (attachEventInvestigationToolHandler as Mock).mockResolvedValue({
      event_uuid: 'event-uuid',
      updated: 1,
      ignored: 0,
    });

    const logger = loggingSystemMock.createLogger();
    const tool = createEventInvestigationAttachTool({
      getScopedClients: vi.fn().mockResolvedValue({
        getEventClient: vi.fn().mockResolvedValue({}),
        getAlertEventsClient: vi.fn().mockResolvedValue(undefined),
        licensing: {},
      }) as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger,
      telemetry: { trackAgentToolEventInvestigationAttach: vi.fn() } as never,
    });

    await invokeHandler(
      tool as never,
      {
        event_uuid: 'event-uuid',
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
