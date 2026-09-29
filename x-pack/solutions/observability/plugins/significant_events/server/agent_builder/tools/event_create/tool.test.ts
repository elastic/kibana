/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import type { SignificantEventsServer } from '../../../types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { eventsWriteHandler } from '../event_write/handler';
import { createEventTool, SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID } from './tool';

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

vi.mock('../event_write/handler', () => {
      const mocked = {
      eventsWriteHandler: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('event_create tool', () => {
  const telemetry = { trackAgentToolEventCreate: vi.fn() };

  it('uses expected tool id', () => {
    const tool = createEventTool({
      getScopedClients: vi.fn() as unknown as GetScopedClients,
      server: {} as SignificantEventsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID);
  });

  it('returns success result', async () => {
    (assertSignificantEventsAccess as Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as Mock).mockResolvedValue(undefined);
    (eventsWriteHandler as Mock).mockResolvedValue({
      event_uuid: 'e1',
      event_id: 'agent-event-abcd1234',
      status: 'open',
      written: true,
    });

    const getScopedClients = vi.fn().mockResolvedValue({
      getEventClient: vi.fn().mockReturnValue({}),
      getAlertEventsClient: vi.fn().mockResolvedValue(undefined),
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
        stream_names: ['logs.a'],
        severity: '60-high',
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
});
