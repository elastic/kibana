/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import type { CPSPluginStart } from '@kbn/cps/public';
import type { ProjectRouting } from '@kbn/es-query';
import { useInfraCpsProjectRouting } from './use_infra_cps_project_routing';

const mockUseKibanaContextForPlugin = jest.fn();
const mockGetBooleanValue = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibanaContextForPlugin: () => mockUseKibanaContextForPlugin(),
}));

describe('useInfraCpsProjectRouting', () => {
  let cpsProjectRouting$: BehaviorSubject<ProjectRouting | undefined>;

  beforeEach(() => {
    cpsProjectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    mockGetBooleanValue.mockReturnValue(true);
    mockUseKibanaContextForPlugin.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: mockGetBooleanValue,
        },
      },
    });
  });

  afterEach(() => {
    cpsProjectRouting$.complete();
  });

  const enableCps = (initialRouting: ProjectRouting | undefined) => {
    cpsProjectRouting$.next(initialRouting);
    mockUseKibanaContextForPlugin.mockReturnValue({
      services: {
        cps: {
          cpsManager: {
            getProjectRouting: jest.fn(() => cpsProjectRouting$.getValue()),
            getProjectRouting$: jest.fn(() => cpsProjectRouting$),
          },
        } as unknown as CPSPluginStart,
        featureFlags: {
          getBooleanValue: mockGetBooleanValue,
        },
      },
    });
  };

  it('does not publish project routing when Infra CPS is disabled', () => {
    enableCps('_alias:_origin');
    mockGetBooleanValue.mockReturnValue(false);

    const { result } = renderHook(() => useInfraCpsProjectRouting());

    expect(result.current).toBeUndefined();
  });

  it('does not publish project routing when CPS is unavailable', () => {
    const { result } = renderHook(() => useInfraCpsProjectRouting());

    expect(result.current).toBeUndefined();
  });

  it('seeds and syncs project routing when Infra CPS is enabled', () => {
    enableCps('_alias:_origin');
    const { result } = renderHook(() => useInfraCpsProjectRouting());

    expect(result.current?.getValue()).toBe('_alias:_origin');

    act(() => cpsProjectRouting$.next('_alias:*'));
    expect(result.current?.getValue()).toBe('_alias:*');
  });

  it('stops syncing project routing after unmount', () => {
    enableCps('_alias:_origin');
    const { result, unmount } = renderHook(() => useInfraCpsProjectRouting());
    const projectRouting$ = result.current;

    unmount();
    act(() => cpsProjectRouting$.next('_alias:*'));

    expect(projectRouting$?.getValue()).toBe('_alias:_origin');
  });
});
