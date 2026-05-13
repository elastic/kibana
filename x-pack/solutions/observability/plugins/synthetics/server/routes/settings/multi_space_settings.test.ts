/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { DefaultSyntheticsMultiSpaceSettingsRepository } from '../../services/synthetics_multi_space_settings_repository';
import {
  createGetMultiSpaceSettingsRoute,
  createPutMultiSpaceSettingsRoute,
} from './multi_space_settings';

describe('multi space settings routes', () => {
  const soClient = savedObjectsClientMock.create();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createGetMultiSpaceSettingsRoute', () => {
    it('returns the settings produced by the repository', async () => {
      const expected = { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] };
      const getSpy = jest
        .spyOn(DefaultSyntheticsMultiSpaceSettingsRepository.prototype, 'get')
        .mockResolvedValue(expected);

      const route = createGetMultiSpaceSettingsRoute();
      const result = await route.handler({
        // @ts-expect-error partial implementation for testing
        savedObjectsClient: soClient,
      });

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  describe('createPutMultiSpaceSettingsRoute', () => {
    it('persists the request body via the repository and returns the saved settings', async () => {
      const body = { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] };
      const saveSpy = jest
        .spyOn(DefaultSyntheticsMultiSpaceSettingsRepository.prototype, 'save')
        .mockResolvedValue(body);

      const route = createPutMultiSpaceSettingsRoute();
      const result = await route.handler({
        // @ts-expect-error partial implementation for testing
        savedObjectsClient: soClient,
        // @ts-expect-error partial implementation for testing
        request: { body },
      });

      expect(saveSpy).toHaveBeenCalledWith(body);
      expect(result).toEqual(body);
    });
  });
});
