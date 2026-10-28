/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { loggerMock } from '@kbn/logging-mocks';
import type { SignificantEventsServer } from '../../types';
import { resolveTokenTrackingCoverage } from './token_tracking_coverage';

const request = { headers: { authorization: 'test' } } as unknown as KibanaRequest;
const logger = loggerMock.create();
const getAll = jest.fn();
const getSetting = jest.fn();
const getScopedClient = jest.fn((rawRequest: KibanaRequest) => rawRequest);
const globalAsScopedToClient = jest.fn(() => ({ get: getSetting }));

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
      uiSettings: { globalAsScopedToClient },
    },
  } as unknown as SignificantEventsServer);

describe('resolveTokenTrackingCoverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSetting.mockResolvedValue(false);
  });

  it('reports full coverage across every space when the global setting is on', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }, { id: 'security' }]);
    getSetting.mockResolvedValue(true);

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 3,
      totalSpaceCount: 3,
    });
  });

  it('reports no coverage when the global setting is off', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }]);

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'none',
      enabledSpaceCount: 0,
      totalSpaceCount: 2,
    });
  });

  it('reads the global setting once instead of once per space', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }, { id: 'security' }]);

    await resolveTokenTrackingCoverage({ request, server: createServer(), logger });

    expect(globalAsScopedToClient).toHaveBeenCalledTimes(1);
    expect(getSetting).toHaveBeenCalledTimes(1);
    expect(getSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING);
  });

  it('counts the default space once when it is also listed', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }]);
    getSetting.mockResolvedValue(true);

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 2,
      totalSpaceCount: 2,
    });
  });

  it('counts only the default space when Spaces is unavailable', async () => {
    getSetting.mockResolvedValue(true);

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

  it('counts the default space when enumeration returns no spaces', async () => {
    getAll.mockResolvedValue([]);
    getSetting.mockResolvedValue(true);

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 1,
      totalSpaceCount: 1,
    });
  });

  it('returns unavailable coverage when the setting cannot be read', async () => {
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
