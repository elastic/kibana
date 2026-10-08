/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SignificantEventsServer } from '../../types';
import { resolveTokenTrackingCoverage } from './token_tracking_coverage';

jest.mock('@kbn/core-http-server-utils', () => ({
  kibanaRequestFactory: jest.fn((rawRequest) => rawRequest),
}));

const request = { headers: { authorization: 'test' } } as unknown as KibanaRequest;
const logger = loggerMock.create();
const getAll = jest.fn();
const getSetting = jest.fn();
const enabledBySpace = new Map<string, boolean>();
const getScopedClient = jest.fn((spaceRequest: { spaceId: string }) => ({
  spaceId: spaceRequest.spaceId,
}));
const asScopedToClient = jest.fn((soClient: { spaceId: string }) => ({
  get: () => getSetting(soClient.spaceId),
}));

const createServer = ({ spacesAvailable = true }: { spacesAvailable?: boolean } = {}) =>
  ({
    spaces: spacesAvailable
      ? {
          spacesService: {
            createSpacesClient: jest.fn().mockReturnValue({ getAll }),
          },
        }
      : undefined,
    core: {
      savedObjects: { getScopedClient },
      uiSettings: { asScopedToClient },
    },
  } as unknown as SignificantEventsServer);

describe('resolveTokenTrackingCoverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enabledBySpace.clear();
    getSetting.mockImplementation(async (spaceId: string) => enabledBySpace.get(spaceId) ?? false);
  });

  it('counts enabled settings across every space and deduplicates the default space', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }, { id: 'security' }]);
    enabledBySpace.set('default', true);
    enabledBySpace.set('engineering', false);
    enabledBySpace.set('security', true);

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'partial',
      enabledSpaceCount: 2,
      totalSpaceCount: 3,
    });
    expect(getSetting.mock.calls.map(([spaceId]) => spaceId).sort()).toEqual([
      'default',
      'engineering',
      'security',
    ]);
  });

  it('reports full and empty coverage', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }]);
    enabledBySpace.set('default', true);
    enabledBySpace.set('engineering', true);
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 2,
      totalSpaceCount: 2,
    });

    enabledBySpace.set('default', false);
    enabledBySpace.set('engineering', false);
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'none',
      enabledSpaceCount: 0,
      totalSpaceCount: 2,
    });
  });

  it('checks only the default space when Spaces is unavailable', async () => {
    enabledBySpace.set('default', true);
    await expect(
      resolveTokenTrackingCoverage({
        request,
        server: createServer({ spacesAvailable: false }),
        logger,
      })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 1,
      totalSpaceCount: 1,
    });
  });

  it('checks the default space when enumeration returns no spaces', async () => {
    getAll.mockResolvedValue([]);
    enabledBySpace.set('default', true);
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 1,
      totalSpaceCount: 1,
    });
  });

  it('limits concurrent settings reads across spaces', async () => {
    getAll.mockResolvedValue([
      { id: 'default' },
      ...Array.from({ length: 11 }, (_, index) => ({ id: `space-${index + 1}` })),
    ]);
    let activeReads = 0;
    let maximumActiveReads = 0;
    let releaseReads: () => void = () => {};
    const readGate = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    getSetting.mockImplementation(async () => {
      activeReads += 1;
      maximumActiveReads = Math.max(maximumActiveReads, activeReads);
      if (getSetting.mock.calls.length === 10) {
        releaseReads();
      }
      await readGate;
      activeReads -= 1;
      return true;
    });

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 12,
      totalSpaceCount: 12,
    });
    expect(maximumActiveReads).toBe(10);
  });

  it('returns unavailable coverage when a space setting cannot be read', async () => {
    getAll.mockResolvedValue([{ id: 'default' }]);
    getSetting.mockRejectedValue(new Error('settings failed'));
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'unavailable',
      enabledSpaceCount: null,
      totalSpaceCount: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to determine token tracking coverage: settings failed'
    );
  });

  it('returns unavailable coverage when spaces cannot be enumerated', async () => {
    getAll.mockRejectedValue(new Error('spaces failed'));
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'unavailable',
      enabledSpaceCount: null,
      totalSpaceCount: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to determine token tracking coverage: spaces failed'
    );
  });
});
