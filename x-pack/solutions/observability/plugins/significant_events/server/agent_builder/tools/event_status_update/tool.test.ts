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
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { updateEventStatusToolHandler } from './handler';
import {
  createEventStatusUpdateTool,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
} from './tool';

vi.mock('../../../routes/utils/assert_significant_events_access', () => {
      const mocked = {
      assertSignificantEventsAccess: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../routes/utils/assert_can_manage_significant_events', () => {
      const mocked = {
      assertCanManageSignificantEvents: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./handler', () => {
      const mocked = {
      updateEventStatusToolHandler: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('event_status_update tool', () => {
  const telemetry = { trackAgentToolEventStatusUpdate: vi.fn() };

  it('uses expected tool id', () => {
    const tool = createEventStatusUpdateTool({
      getScopedClients: vi.fn() as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID);
  });

  it('returns success result', async () => {
    (assertSignificantEventsAccess as Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as Mock).mockResolvedValue(undefined);
    (updateEventStatusToolHandler as Mock).mockResolvedValue({
      event_uuid: 'e1',
      updated: 1,
      ignored: 0,
      status: 'closed',
    });

    const getScopedClients = vi.fn().mockResolvedValue({
      getEventClient: vi.fn().mockReturnValue({}),
      getAlertEventsClient: vi.fn().mockResolvedValue(undefined),
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
      { event_uuid: 'e1', status: 'closed' },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
    expect(assertCanManageSignificantEvents).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
  });
});
