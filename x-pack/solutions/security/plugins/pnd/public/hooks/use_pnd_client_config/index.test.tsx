/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { PndBrowserConfig } from '.';
import { PndClientConfigProvider, useIsDemoMode, usePndClientConfig } from '.';

const baseConfig: PndBrowserConfig = {
  enabled: true,
  ui: { useMockData: false },
};

const wrapperFor = (config: PndBrowserConfig): React.FC<{ children: React.ReactNode }> =>
  function ConfigWrapper({ children }) {
    return <PndClientConfigProvider config={config}>{children}</PndClientConfigProvider>;
  };

describe('usePndClientConfig', () => {
  it('returns the provided config', () => {
    const { result } = renderHook(() => usePndClientConfig(), {
      wrapper: wrapperFor(baseConfig),
    });

    expect(result.current).toEqual(baseConfig);
  });

  it('returns undefined without a provider', () => {
    const { result } = renderHook(() => usePndClientConfig());

    expect(result.current).toBeUndefined();
  });
});

describe('useIsDemoMode', () => {
  it('is true when the browser-exposed demo switch is on', () => {
    const { result } = renderHook(() => useIsDemoMode(), {
      wrapper: wrapperFor({ ...baseConfig, demo: { forceIncident: true } }),
    });

    expect(result.current).toBe(true);
  });

  it('is false when the demo switch is off', () => {
    const { result } = renderHook(() => useIsDemoMode(), {
      wrapper: wrapperFor({ ...baseConfig, demo: { forceIncident: false } }),
    });

    expect(result.current).toBe(false);
  });

  it('is false when the demo block is absent, which is the case before the server config lands', () => {
    const { result } = renderHook(() => useIsDemoMode(), {
      wrapper: wrapperFor(baseConfig),
    });

    expect(result.current).toBe(false);
  });

  it('is false without a provider, so a real run is never mislabeled as a demo', () => {
    const { result } = renderHook(() => useIsDemoMode());

    expect(result.current).toBe(false);
  });
});
