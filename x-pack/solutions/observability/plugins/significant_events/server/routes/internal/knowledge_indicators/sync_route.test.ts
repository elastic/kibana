/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { syncRoutes } from './sync_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

vi.mock('../../utils/assert_significant_events_access', () => {
      const mocked = {
      assertSignificantEventsAccess: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

const route = syncRoutes['GET /internal/streams/_knowledge_indicators/_streams_with_indicators'];

type HandlerParams = Parameters<typeof route.handler>[0];

const makeHandlerParams = ({ streamNames }: { streamNames: string[] }): HandlerParams =>
  ({
    params: {},
    request: {},
    getScopedClients: vi.fn().mockResolvedValue({
      licensing: {},
      getKnowledgeIndicatorClient: vi.fn().mockResolvedValue({
        getStreamNamesToReconcile: vi.fn().mockResolvedValue(streamNames),
      }),
    }),
    server: {} as HandlerParams['server'],
  } as unknown as HandlerParams);

describe('streamsWithIndicatorsRoute', () => {
  beforeEach(() => {
    (assertSignificantEventsAccess as Mock).mockClear();
  });

  it('maps stream names to the foreach item shape', async () => {
    const result = await route.handler(
      makeHandlerParams({ streamNames: ['logs.nginx', 'logs.app'] })
    );

    expect(result).toEqual({
      streams: [{ streamName: 'logs.nginx' }, { streamName: 'logs.app' }],
    });
  });

  it('returns an empty list when there is nothing to reconcile', async () => {
    const result = await route.handler(makeHandlerParams({ streamNames: [] }));

    expect(result).toEqual({ streams: [] });
  });

  it('enforces significant events access', async () => {
    await route.handler(makeHandlerParams({ streamNames: [] }));

    expect(assertSignificantEventsAccess).toHaveBeenCalledTimes(1);
  });
});
