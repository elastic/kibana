/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

vi.mock('react-use/lib/useLocalStorage', () => ({
  default: vi.fn().mockImplementation((key, defaultValue) => {
    if (key.includes('START_LOCAL_STORAGE_KEY')) {
      return ['now-24h', vi.fn()];
    }
    if (key.includes('END_LOCAL_STORAGE_KEY')) {
      return ['now', vi.fn()];
    }
    if (key.includes('CONNECTOR_ID_LOCAL_STORAGE_KEY')) {
      return ['test-id', vi.fn()];
    }
    return [defaultValue || 'test-id', vi.fn()];
  }),
}));

vi.mock('@kbn/inference-connectors', () => {
  const mocked = {
    useLoadConnectors: vi.fn(() => ({
      isFetched: true,
      data: mockConnectors,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../use_attack_discovery', () => {
  const mocked = {
    useAttackDiscovery: vi.fn().mockReturnValue({
      fetchAttackDiscoveries: vi.fn(),
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        uiSettings: {
          get: vi.fn(),
        },
        settings: {},
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/elastic-assistant', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../data_view_manager/hooks/use_data_view', () => {
  const mocked = {
    useDataView: () => ({
      dataView: {},
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/lib/kuery', () => {
  const mocked = {
    convertToBuildEsQuery: vi.fn().mockReturnValue([{}, null]),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_invalid_filter_query', () => {
  const mocked = {
    useInvalidFilterQuery: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../use_get_attack_discovery_generations', () => {
  const mocked = {
    useInvalidateGetAttackDiscoveryGenerations: vi.fn().mockReturnValue(vi.fn()),
  };
  return { ...mocked, default: mocked };
});

describe('useAttackDiscoveryControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useLoadConnectors as Mock).mockReturnValue({
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
    const fetchAttackDiscoveriesMock = vi.fn();
    (useAttackDiscovery as Mock).mockReturnValue({
      fetchAttackDiscoveries: fetchAttackDiscoveriesMock,
      isLoading: false,
    });

    // Override the localStorage mock to return proper values for this test
    (useLocalStorage as Mock).mockImplementation((key: string) => {
      if (key.includes('start')) {
        return ['now-24h', vi.fn()];
      }
      if (key.includes('end')) {
        return ['now', vi.fn()];
      }
      if (key.includes('connectorId')) {
        return ['test-id', vi.fn()];
      }
      return [undefined, vi.fn()];
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

  describe('when multiple connectors are available', () => {
    const multipleConnectors: unknown[] = [
      { id: 'connector-1', name: 'Connector 1', actionTypeId: '.inference' },
      { id: 'connector-2', name: 'Connector 2', actionTypeId: '.inference' },
    ];

    beforeEach(() => {
      (useLoadConnectors as Mock).mockReturnValue({
        isFetched: true,
        data: multipleConnectors,
      });
    });

    it('defaults to the first (highest-priority) connector when none is selected', () => {
      (useLocalStorage as Mock).mockImplementation((key: string) => {
        if (key.endsWith('connectorId')) {
          return [undefined, vi.fn()];
        }
        return ['test-id', vi.fn()];
      });

      const { result } = renderHook(() => useAttackDiscoveryControls());

      expect(result.current.connectorId).toBe('connector-1');
    });

    it('does not override an existing selected connectorId', () => {
      (useLocalStorage as Mock).mockImplementation((key: string) => {
        if (key.endsWith('connectorId')) {
          return ['connector-2', vi.fn()];
        }
        return ['test-id', vi.fn()];
      });

      const { result } = renderHook(() => useAttackDiscoveryControls());

      expect(result.current.connectorId).toBe('connector-2');
    });
  });
});
