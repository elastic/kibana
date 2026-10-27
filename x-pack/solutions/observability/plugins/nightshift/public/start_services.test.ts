/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppUpdater } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import { FocusedSignificantEventService } from './chat/focused_significant_event_service';
import { startNightshiftServices } from './start_services';

const mockCleanup = jest.fn();

jest.mock('./chat/agent_builder/significant_event_attachments', () => ({
  registerNightshiftAgentBuilderAttachments: jest.fn(() => mockCleanup),
}));

describe('startNightshiftServices', () => {
  beforeEach(() => {
    mockCleanup.mockClear();
  });

  it('cleans up a late attachment registration after services stop', async () => {
    const subscription = startNightshiftServices({
      pluginsStart: {
        agentBuilder: {},
        share: {},
        significantEvents: {
          significantEventsRepositoryClient: {
            fetch: jest.fn().mockResolvedValue({ available: true }),
          },
        },
      } as never,
      appUpdater$: new BehaviorSubject<AppUpdater>(() => ({})),
      context: {
        logger: {
          get: jest.fn(() => ({ error: jest.fn() })),
        },
      } as never,
      chrome: {} as never,
      focusedSignificantEventService: new FocusedSignificantEventService(),
    });

    subscription.unsubscribe();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });
});
