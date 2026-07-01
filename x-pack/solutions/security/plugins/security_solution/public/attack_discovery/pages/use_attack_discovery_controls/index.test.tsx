/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useAttackDiscoveryControls } from '.';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useAttackDiscovery } from '../use_attack_discovery';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { SETTINGS_TAB_ID } from '../settings_flyout/constants';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];

jest.mock('react-use/lib/useLocalStorage', () =>
  jest.fn().mockImplementation((key, defaultValue) => {
    if (key.includes('START_LOCAL_STORAGE_KEY')) {
      return ['now-24h', jest.fn()];
    }
    if (key.includes('END_LOCAL_STORAGE_KEY')) {
      return ['now', jest.fn()];
    }
    if (key.includes('CONNECTOR_ID_LOCAL_STORAGE_KEY')) {
      return ['test-id', jest.fn()];
    }
    return [defaultValue || 'test-id', jest.fn()];
  })
);

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));

jest.mock('../use_attack_discovery', () => ({
  useAttackDiscovery: jest.fn().mockReturnValue({
    fetchAttackDiscoveries: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      uiSettings: {
        get: jest.fn(),
      },
      settings: {},
    },
  }),
}));

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => ({
    http: {},
  }),
  ATTACK_DISCOVERY_STORAGE_KEY: 'attackDiscovery',
  DEFAULT_ASSISTANT_NAMESPACE: 'elasticAssistantDefault',
  DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS: 100,
  END_LOCAL_STORAGE_KEY: 'end',
  FILTERS_LOCAL_STORAGE_KEY: 'filters',
  MAX_ALERTS_LOCAL_STORAGE_KEY: 'maxAlerts',
  QUERY_LOCAL_STORAGE_KEY: 'query',
  START_LOCAL_STORAGE_KEY: 'start',
}));

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({
    dataView: {},
  }),
}));

jest.mock('../../../common/lib/kuery', () => ({
  convertToBuildEsQuery: jest.fn().mockReturnValue([{}, null]),
}));

jest.mock('../../../common/hooks/use_invalid_filter_query', () => ({
  useInvalidFilterQuery: jest.fn(),
}));

jest.mock('../use_get_attack_discovery_generations', () => ({
  useInvalidateGetAttackDiscoveryGenerations: jest.fn().mockReturnValue(jest.fn()),
}));

describe('useAttackDiscoveryControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useLoadConnectors as jest.Mock).mockReturnValue({
      isFetched: true,
      data: mockConnectors,
    });
  });

  it('should return initial state and actions', () => {
    const { result } = renderHook(() => useAttackDiscoveryControls());

    expect(result.current.aiConnectors).toEqual(mockConnectors);
    expect(result.current.connectorId).toBe('test-id');
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.onGenerate).toBe('function');
    expect(typeof result.current.openFlyout).toBe('function');
    expect(result.current.settingsFlyout).toBeNull();
  });

  it('should open settings flyout', () => {
    const { result } = renderHook(() => useAttackDiscoveryControls());

    act(() => {
      result.current.openFlyout(SETTINGS_TAB_ID);
    });

    expect(result.current.settingsFlyout).not.toBeNull();
  });

  it('invokes fetchAttackDiscoveries with the expected parameters when onGenerate is called', async () => {
    const fetchAttackDiscoveriesMock = jest.fn();
    (useAttackDiscovery as jest.Mock).mockReturnValue({
      fetchAttackDiscoveries: fetchAttackDiscoveriesMock,
      isLoading: false,
    });

    // Override the localStorage mock to return proper values for this test
    (useLocalStorage as jest.Mock).mockImplementation((key: string) => {
      if (key.includes('start')) {
        return ['now-24h', jest.fn()];
      }
      if (key.includes('end')) {
        return ['now', jest.fn()];
      }
      if (key.includes('connectorId')) {
        return ['test-id', jest.fn()];
      }
      return [undefined, jest.fn()];
    });

    const { result } = renderHook(() => useAttackDiscoveryControls());

    await act(async () => {
      await result.current.onGenerate();
    });

    expect(fetchAttackDiscoveriesMock).toHaveBeenCalledWith({
      end: 'now',
      filter: undefined,
      overrideConnectorId: undefined,
      overrideEnd: undefined,
      overrideFilter: undefined,
      overrideSize: undefined,
      overrideStart: undefined,
      size: 100,
      start: 'now-24h',
    });
  });
});
