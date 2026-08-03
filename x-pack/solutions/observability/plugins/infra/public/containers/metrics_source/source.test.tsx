/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { useSourceFetcher } from './source';

const mockLoadSource = jest.fn();
const mockPersistSourceConfiguration = jest.fn();
const mockUseKibanaContextForPlugin = jest.fn();
const mockUseTrackedPromise = jest.fn();
const mockGetBooleanValue = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => mockUseKibanaContextForPlugin(),
}));

jest.mock('../../hooks/use_tracked_promise', () => ({
  useTrackedPromise: (...args: unknown[]) => mockUseTrackedPromise(...args),
}));

jest.mock('./notifications', () => ({
  useSourceNotifier: () => ({
    updateFailure: jest.fn(),
    updateSuccess: jest.fn(),
  }),
}));

describe('useSourceFetcher', () => {
  let projectRouting$: BehaviorSubject<ProjectRouting | undefined>;

  beforeEach(() => {
    projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    mockUseKibanaContextForPlugin.mockReturnValue({
      services: {
        cps: {
          cpsManager: {
            getProjectRouting$: () => projectRouting$,
          },
        },
        http: {},
        telemetry: {},
        featureFlags: {
          getBooleanValue: mockGetBooleanValue,
        },
      },
    });
    mockGetBooleanValue.mockReturnValue(true);
    mockUseTrackedPromise
      .mockReset()
      .mockReturnValueOnce([{ state: 'uninitialized' }, mockLoadSource])
      .mockReturnValueOnce([{ state: 'uninitialized' }, mockPersistSourceConfiguration]);
    mockLoadSource.mockClear();
    mockPersistSourceConfiguration.mockClear();
  });

  it('reloads source status when CPS project routing changes and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useSourceFetcher({ sourceId: 'default' }));

    expect(mockLoadSource).toHaveBeenCalledTimes(1);

    act(() => projectRouting$.next('_alias:*'));
    expect(mockLoadSource).toHaveBeenCalledTimes(2);

    unmount();
    act(() => projectRouting$.next('_alias:_origin'));
    expect(mockLoadSource).toHaveBeenCalledTimes(2);
  });

  it('does not reload source status when Infra CPS is disabled', () => {
    mockGetBooleanValue.mockReturnValue(false);
    renderHook(() => useSourceFetcher({ sourceId: 'default' }));

    act(() => projectRouting$.next('_alias:*'));
    expect(mockLoadSource).toHaveBeenCalledTimes(1);
  });
});
