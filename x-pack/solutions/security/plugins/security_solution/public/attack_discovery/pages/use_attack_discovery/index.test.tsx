/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_INTERNAL,
  ATTACK_DISCOVERY_GENERATE,
} from '@kbn/elastic-assistant-common';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { useAttackDiscovery } from '.';
import { ERROR_GENERATING_ATTACK_DISCOVERIES } from '../translations';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createQueryWrapperMock } from '../../../common/__mocks__/query_wrapper';

jest.mock('../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(() => ({
    hasAssistantPrivilege: true,
    isAssistantEnabled: true,
    isAssistantVisible: true,
  })),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields'
);
jest.mock('../../../common/lib/kibana');
const mockedUseKibana = mockUseKibana();

const mockAssistantAvailability = jest.fn(() => ({
  hasAssistantPrivilege: true,
}));
const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];
jest.mock('@kbn/elastic-assistant', () => ({
  AssistantOverlay: () => <div data-test-subj="assistantOverlay" />,
  useAssistantContext: () => ({
    alertsIndexPattern: 'alerts-index-pattern',
    assistantAvailability: mockAssistantAvailability(),
    knowledgeBase: {
      latestAlerts: 20,
    },
  }),
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));

const mockUseKibanaFeatureFlags = jest
  .fn()
  .mockReturnValue({ attackDiscoveryPublicApiEnabled: false });
jest.mock('../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

const setLoadingConnectorId = jest.fn();

const SIZE = 20;

const { wrapper: queryWrapper } = createQueryWrapperMock();

describe('useAttackDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(mockedUseKibana);
    (useFetchAnonymizationFields as jest.Mock).mockReturnValue({ data: [] });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: 20,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    expect(result.current.isLoading).toBe(false);
  });

  describe('when attackDiscoveryPublicApiEnabled is false', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: false });
      (mockedUseKibana.services.http.post as jest.Mock).mockResolvedValue({});
    });

    it('calls POST with the internal API route', async () => {
      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as jest.Mock).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_INTERNAL,
        expect.any(Object)
      );
    });

    it('calls POST with the internal API version', async () => {
      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: SIZE,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as jest.Mock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: API_VERSIONS.internal.v1,
        })
      );
    });
  });

  describe('when attackDiscoveryPublicApiEnabled is true', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: true });
      (mockedUseKibana.services.http.post as jest.Mock).mockResolvedValue({});
    });

    it('calls POST with the public API route', async () => {
      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as jest.Mock).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_GENERATE,
        expect.objectContaining({
          version: API_VERSIONS.public.v1,
        })
      );
    });

    it('calls POST using the public API version', async () => {
      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: SIZE,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as jest.Mock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: API_VERSIONS.public.v1,
        })
      );
    });
  });

  it('handles fetch errors correctly', async () => {
    const errorMessage = 'Fetch error';
    const error = new Error(errorMessage);
    (mockedUseKibana.services.http.post as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useAttackDiscovery({ connectorId: 'test-id', size: SIZE }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.notifications.toasts.addDanger).toHaveBeenCalledWith(error, {
      title: ERROR_GENERATING_ATTACK_DISCOVERIES,
      text: errorMessage,
    });
    expect(result.current.isLoading).toBe(false);
  });
});
