/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSelectedMonitor } from './use_selected_monitor';
import { useRemoteMonitor } from './use_remote_monitor';
import { useGetUrlParams } from '../../../hooks';
import { MonitorTypeEnum } from '../../../../../../common/runtime_types';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ monitorId: 'config-1' }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

jest.mock('../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: () => ({ space: { id: 'default' } }),
}));

jest.mock('../../../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ lastRefresh: 0, refreshInterval: 60 }),
}));

jest.mock('../../../state', () => ({
  getMonitorAction: { get: jest.fn((payload) => ({ type: 'MONITOR_GET', payload })) },
  selectEncryptedSyntheticsSavedMonitors: jest.fn(),
  selectMonitorListState: jest.fn(),
  selectorMonitorDetailsState: jest.fn(),
  selectSyntheticsMonitorError: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  useGetUrlParams: jest.fn(),
}));

jest.mock('./use_remote_monitor', () => ({
  useRemoteMonitor: jest.fn(),
}));

import { useSelector } from 'react-redux';
import {
  getMonitorAction,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
  selectorMonitorDetailsState,
  selectSyntheticsMonitorError,
} from '../../../state';

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockUseRemoteMonitor = useRemoteMonitor as jest.MockedFunction<typeof useRemoteMonitor>;
const mockUseGetUrlParams = useGetUrlParams as jest.MockedFunction<typeof useGetUrlParams>;

interface SetupOptions {
  remoteName?: string;
  remoteMonitor?: ReturnType<typeof useRemoteMonitor>['data'];
  remoteLoading?: boolean;
  localMonitor?: { config_id: string; name: string } | null;
  localLoading?: boolean;
  monitorListLoading?: boolean;
  localError?: { body?: { statusCode?: number }; getPayload?: unknown } | null;
}

const setupMocks = ({
  remoteName,
  remoteMonitor = undefined,
  remoteLoading = false,
  localMonitor = { config_id: 'config-1', name: 'Local monitor' },
  localLoading = false,
  monitorListLoading = false,
  localError = null,
}: SetupOptions) => {
  mockUseGetUrlParams.mockReturnValue({
    spaceId: undefined,
    remoteName,
  } as ReturnType<typeof useGetUrlParams>);

  mockUseRemoteMonitor.mockReturnValue({
    data: remoteMonitor,
    loading: remoteLoading,
    error: undefined,
  });

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectEncryptedSyntheticsSavedMonitors) {
      return localMonitor ? [localMonitor] : [];
    }
    if (selector === selectMonitorListState) {
      return { loading: monitorListLoading };
    }
    if (selector === selectorMonitorDetailsState) {
      return {
        syntheticsMonitor: localMonitor,
        syntheticsMonitorLoading: localLoading,
        syntheticsMonitorDispatchedAt: 0,
      };
    }
    if (selector === selectSyntheticsMonitorError) {
      return localError;
    }
    return undefined;
  });
};

describe('useSelectedMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('local path (no remoteName in URL)', () => {
    it('returns the local saved monitor and does not call useRemoteMonitor with a remoteName', () => {
      setupMocks({});

      const { result } = renderHook(() => useSelectedMonitor());

      expect(result.current.monitor).toEqual({ config_id: 'config-1', name: 'Local monitor' });
      expect(mockUseRemoteMonitor).toHaveBeenCalledWith({
        configId: 'config-1',
        remoteName: undefined,
      });
    });

    it('propagates the local error from the Redux selector', () => {
      const localError = { body: { statusCode: 500 } };
      setupMocks({ localError });

      const { result } = renderHook(() => useSelectedMonitor());

      expect(result.current.error).toBe(localError);
    });
  });

  describe('remote path (remoteName in URL)', () => {
    const remoteMonitor = {
      config_id: 'config-1',
      id: 'config-1',
      name: 'Remote monitor',
      type: MonitorTypeEnum.BROWSER,
      tags: [],
      locations: [],
      remote: { remoteName: 'cluster-a' },
    };

    it('returns the remote monitor from useRemoteMonitor instead of the local SO', () => {
      setupMocks({ remoteName: 'cluster-a', remoteMonitor });

      const { result } = renderHook(() => useSelectedMonitor());

      expect(result.current.monitor).toBe(remoteMonitor);
      expect(mockUseRemoteMonitor).toHaveBeenCalledWith({
        configId: 'config-1',
        remoteName: 'cluster-a',
      });
    });

    it('does not dispatch a local SO fetch when the URL has a remoteName', () => {
      setupMocks({ remoteName: 'cluster-a', remoteMonitor: undefined, localMonitor: null });

      renderHook(() => useSelectedMonitor());

      expect(getMonitorAction.get).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns loading=true while useRemoteMonitor is loading', () => {
      setupMocks({ remoteName: 'cluster-a', remoteLoading: true });

      const { result } = renderHook(() => useSelectedMonitor());

      expect(result.current.loading).toBe(true);
    });

    it('never reports isMonitorMissing for remote (the 404 path is local-only)', () => {
      const localError = {
        body: { statusCode: 404 },
        getPayload: () => ({ monitorId: 'config-1' }),
      };
      setupMocks({ remoteName: 'cluster-a', remoteMonitor: undefined, localError });

      const { result } = renderHook(() => useSelectedMonitor());

      expect(result.current.isMonitorMissing).toBe(false);
    });

    it('reports null error for remote (local HTTP-fetch error shape is suppressed)', () => {
      const localError = { body: { statusCode: 500 } };
      setupMocks({ remoteName: 'cluster-a', remoteMonitor: undefined, localError });

      const { result } = renderHook(() => useSelectedMonitor());

      expect(result.current.error).toBeNull();
    });
  });
});
