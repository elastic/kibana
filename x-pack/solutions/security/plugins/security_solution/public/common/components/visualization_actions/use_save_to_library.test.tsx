/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useSaveToLibrary } from './use_save_to_library';
import { useKibana } from '../../lib/kibana';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';

vi.mock('../../lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_redirect_to_dashboard_from_lens', () => {
      const mocked = {
      useRedirectToDashboardFromLens: vi.fn().mockReturnValue({
        redirectTo: vi.fn(),
        getEditOrCreateDashboardPath: vi.fn().mockReturnValue('mockDashboardPath'),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../link_to', () => {
      const mocked = {
      useGetSecuritySolutionUrl: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/react-kibana-mount', () => {
      const mocked = {
      toMountPoint: vi.fn().mockReturnValue(vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

const mockUseKibana = useKibana as Mock;

describe('useSaveToLibrary hook', () => {
  const mockStartServices = {
    application: { capabilities: { visualize_v2: { save: true } } },
    lens: { SaveModalComponent: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: mockStartServices });
  });

  it('should open the save visualization flyout when openSaveVisualizationFlyout is called', () => {
    const { result } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );

    act(() => {
      result.current.openSaveVisualizationFlyout();
    });

    expect(toMountPoint).toHaveBeenCalled();
  });

  it('should disable visualizations if user cannot save', () => {
    const noSaveCapabilities = {
      ...mockStartServices,
      application: { capabilities: { visualize_v2: { save: false } } },
    };
    mockUseKibana.mockReturnValue({ services: noSaveCapabilities });

    const { result } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );
    expect(result.current.disableVisualizations).toBe(true);
  });

  it('should disable visualizations if attributes are missing', () => {
    mockUseKibana.mockReturnValue({ services: mockStartServices });
    const { result } = renderHook(() => useSaveToLibrary({ attributes: null }));
    expect(result.current.disableVisualizations).toBe(true);
  });

  it('should enable visualizations if user can save and attributes are present', () => {
    const { result } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );
    expect(result.current.disableVisualizations).toBe(false);
  });
});
