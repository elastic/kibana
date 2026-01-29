/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from './get_agent_builder_resource_availability';

describe('getAgentBuilderResourceAvailability', () => {
  let mockCore: SecuritySolutionPluginCoreSetupDependencies;
  let mockLogger: jest.Mocked<Logger>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockSpacesStart: ReturnType<typeof spacesMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore = coreMock.createSetup() as SecuritySolutionPluginCoreSetupDependencies;
    mockLogger = loggingSystemMock.createLogger();
    mockRequest = httpServerMock.createKibanaRequest();
    mockSpacesStart = spacesMock.createStart();
  });

  it('returns available when space has no solution', async () => {
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'default',
      solution: undefined,
    });
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart },
      {},
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns available when space solution is classic', async () => {
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'default',
      solution: 'classic',
    });
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart },
      {},
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns available when space solution is security', async () => {
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'default',
      solution: 'security',
    });
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart },
      {},
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns unavailable when space solution is not allowed', async () => {
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'default',
      solution: 'oblt',
    });
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart },
      {},
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe('Security agent builder resources are not available in this space');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Security agent builder resources are not available in this space, skipping registration.'
    );
  });

  it('returns available when spaces service is unavailable', async () => {
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([{}, { spaces: undefined }, {}]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns available when getActiveSpace throws an error', async () => {
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockRejectedValue(
      new Error('Spaces unavailable')
    );
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart },
      {},
    ]);

    const result = await getAgentBuilderResourceAvailability({
      core: mockCore,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Spaces are unavailable, returning available for Security agent builder resources.'
    );
  });
});
