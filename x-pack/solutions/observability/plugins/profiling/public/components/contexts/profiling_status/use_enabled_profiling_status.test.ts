/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { EnabledProfilingStatus, ProfilingStatus } from '@kbn/profiling-utils';
import { AsyncStatus } from '../../../hooks/use_async';
import { useProfilingStatus } from './use_profiling_status';
import { useEnabledProfilingStatus } from './use_enabled_profiling_status';

jest.mock('./use_profiling_status');

const enabledStatus: EnabledProfilingStatus = {
  isEnabled: true,
  otel: { isAvailable: true, hasData: false },
  universalProfiling: {
    isAvailable: true,
    hasSetup: true,
    hasData: true,
    hasLegacyData: false,
    canSetup: true,
  },
};

describe('useEnabledProfilingStatus', () => {
  const refresh = jest.fn();

  const mockStatus = (status: AsyncStatus, data?: ProfilingStatus) => {
    (useProfilingStatus as jest.Mock).mockReturnValue({ status, data, refresh });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the status when profiling is enabled', () => {
    mockStatus(AsyncStatus.Settled, enabledStatus);

    const { result } = renderHook(() => useEnabledProfilingStatus());

    expect(result.current).toEqual({ data: enabledStatus, refresh });
  });

  it.each([
    ['profiling is disabled in Elasticsearch', AsyncStatus.Settled, { isEnabled: false } as const],
    ['the status is still loading', AsyncStatus.Loading, undefined],
  ])('throws when %s', (_name, status, data) => {
    mockStatus(status, data);

    expect(() => renderHook(() => useEnabledProfilingStatus())).toThrow(
      'useEnabledProfilingStatus must only be used below CheckStatus, once profiling is enabled'
    );
  });
});
