/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetCCSSettingsRoute, createPutCCSSettingsRoute } from './ccs_settings';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../constants/settings';

jest.mock('../../saved_objects/synthetics_settings', () => ({
  getSyntheticsDynamicSettings: jest.fn(),
  setSyntheticsDynamicSettings: jest.fn(),
}));

const { getSyntheticsDynamicSettings, setSyntheticsDynamicSettings } = jest.requireMock(
  '../../saved_objects/synthetics_settings'
);

const savedObjectsClient = {} as any;

const buildServerMock = (overrides: Record<string, unknown> = {}) => ({
  isElasticsearchServerless: false,
  ...overrides,
});

const buildResponseMock = () => ({
  badRequest: jest.fn((opts) => opts),
});

describe('CCS Settings Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /internal/synthetics/ccs_settings', () => {
    const getRoute = createGetCCSSettingsRoute();

    it('returns defaults on serverless', async () => {
      const result = await getRoute.handler({
        savedObjectsClient,
        server: buildServerMock({ isElasticsearchServerless: true }),
      } as any);

      expect(result).toEqual({
        useAllRemoteClusters: false,
        selectedRemoteClusters: [],
      });
      expect(getSyntheticsDynamicSettings).not.toHaveBeenCalled();
    });

    it('reads CCS fields from dynamic settings', async () => {
      getSyntheticsDynamicSettings.mockResolvedValueOnce({
        ...DYNAMIC_SETTINGS_DEFAULTS,
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a', 'cluster-b'],
      });

      const result = await getRoute.handler({
        savedObjectsClient,
        server: buildServerMock(),
      } as any);

      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a', 'cluster-b'],
      });
      expect(getSyntheticsDynamicSettings).toHaveBeenCalledWith(savedObjectsClient);
    });

    it('falls back to defaults when CCS fields are undefined', async () => {
      getSyntheticsDynamicSettings.mockResolvedValueOnce({
        ...DYNAMIC_SETTINGS_DEFAULTS,
        useAllRemoteClusters: undefined,
        selectedRemoteClusters: undefined,
      });

      const result = await getRoute.handler({
        savedObjectsClient,
        server: buildServerMock(),
      } as any);

      expect(result).toEqual({
        useAllRemoteClusters: false,
        selectedRemoteClusters: [],
      });
    });
  });

  describe('PUT /internal/synthetics/ccs_settings', () => {
    const putRoute = createPutCCSSettingsRoute();

    it('returns badRequest on serverless', async () => {
      const response = buildResponseMock();

      await putRoute.handler({
        savedObjectsClient,
        server: buildServerMock({ isElasticsearchServerless: true }),
        request: { body: { useAllRemoteClusters: true, selectedRemoteClusters: [] } },
        response,
      } as any);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: 'CCS settings are not available in serverless mode.' },
      });
      expect(setSyntheticsDynamicSettings).not.toHaveBeenCalled();
    });

    it('merges CCS fields into existing dynamic settings', async () => {
      const existingSettings = {
        ...DYNAMIC_SETTINGS_DEFAULTS,
        certAgeThreshold: 365,
      };
      getSyntheticsDynamicSettings.mockResolvedValueOnce(existingSettings);
      setSyntheticsDynamicSettings.mockResolvedValueOnce({
        ...existingSettings,
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['cluster-x'],
      });

      const result = await putRoute.handler({
        savedObjectsClient,
        server: buildServerMock(),
        request: {
          body: {
            useAllRemoteClusters: false,
            selectedRemoteClusters: ['cluster-x'],
          },
        },
        response: buildResponseMock(),
      } as any);

      expect(setSyntheticsDynamicSettings).toHaveBeenCalledWith(savedObjectsClient, {
        ...existingSettings,
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['cluster-x'],
      });
      expect(result).toEqual({
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['cluster-x'],
      });
    });

    it('preserves existing non-CCS settings when saving', async () => {
      const existingSettings = {
        ...DYNAMIC_SETTINGS_DEFAULTS,
        certAgeThreshold: 999,
        certExpirationThreshold: 7,
        defaultConnectors: ['pagerduty'],
      };
      getSyntheticsDynamicSettings.mockResolvedValueOnce(existingSettings);
      setSyntheticsDynamicSettings.mockResolvedValueOnce({
        ...existingSettings,
        useAllRemoteClusters: true,
        selectedRemoteClusters: [],
      });

      await putRoute.handler({
        savedObjectsClient,
        server: buildServerMock(),
        request: {
          body: {
            useAllRemoteClusters: true,
            selectedRemoteClusters: [],
          },
        },
        response: buildResponseMock(),
      } as any);

      const savedPayload = setSyntheticsDynamicSettings.mock.calls[0][1];
      expect(savedPayload.certAgeThreshold).toBe(999);
      expect(savedPayload.certExpirationThreshold).toBe(7);
      expect(savedPayload.defaultConnectors).toEqual(['pagerduty']);
    });
  });
});
