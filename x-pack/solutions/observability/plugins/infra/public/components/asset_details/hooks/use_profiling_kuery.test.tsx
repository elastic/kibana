/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter, useHistory } from 'react-router-dom';
import { renderHook, act } from '@testing-library/react';
import { useProfilingKuery } from './use_profiling_kuery';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';

jest.mock('./use_asset_details_render_props');

describe('useProfilingKuery', () => {
  const asset = { name: 'test-host' };

  beforeEach(() => {
    (useAssetDetailsRenderPropsContext as jest.Mock).mockReturnValue({ asset });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('gets initial search value from the URL if present', () => {
    const { result } = renderHook(() => useProfilingKuery(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <MemoryRouter
          initialEntries={[
            '/metrics/detail/host?assetDetails=(profilingSearch:%27Stacktrace.count%20%3E%3D%205%27)',
          ]}
        >
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current.fullKuery).toBe('host.name : "test-host" and Stacktrace.count >= 5');
    expect(result.current.customKuery).toBe('Stacktrace.count >= 5');
  });

  it('saves new custom kuery to the URL', () => {
    const { result } = renderHook(
      () => ({ profilingKuery: useProfilingKuery(), history: useHistory() }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <MemoryRouter initialEntries={['/metrics/detail/host']}>{children}</MemoryRouter>
        ),
      }
    );

    act(() => {
      result.current.profilingKuery.setCustomKuery('Stacktrace.count > 5');
    });

    expect(result.current.history.location.search).toBe(
      encodeURI("?assetDetails=(profilingSearch:'Stacktrace.count > 5')")
    );
  });
});
