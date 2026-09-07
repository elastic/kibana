/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { getAgentBuilderResourceAvailability } from './get_agent_builder_resource_availability';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const mockCore = coreMock.createSetup();
const request = httpServerMock.createKibanaRequest();

describe('getAgentBuilderResourceAvailability', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {},
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: 'oblt' }),
          },
        },
      },
    ]);
  });

  it('returns available when space solution is Observability', async () => {
    const result = await getAgentBuilderResourceAvailability({
      core: mockCore as any,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns unavailable when space solution is Elasticsearch', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {},
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: 'es' }),
          },
        },
      },
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore as any,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/Observability .* not available in this space/);
  });

  it('returns unavailable when space solution is Security', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {},
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: 'security' }),
          },
        },
      },
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore as any,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/Observability .* not available in this space/);
  });

  it('returns available when space solution is undefined', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {},
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: undefined }),
          },
        },
      },
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore as any,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns available when spaces plugin is unavailable', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([{}, {}]);
    const result = await getAgentBuilderResourceAvailability({
      core: mockCore as any,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });
});
