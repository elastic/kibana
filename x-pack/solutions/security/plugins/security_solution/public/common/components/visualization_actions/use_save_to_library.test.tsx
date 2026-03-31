/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useSaveToLibrary } from './use_save_to_library';
import { useKibana } from '../../lib/kibana';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';

jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_redirect_to_dashboard_from_lens', () => ({
  useRedirectToDashboardFromLens: jest.fn().mockReturnValue({
    redirectTo: jest.fn(),
    getEditOrCreateDashboardPath: jest.fn().mockReturnValue('mockDashboardPath'),
  }),
}));

jest.mock('../link_to', () => ({
  useGetSecuritySolutionUrl: jest.fn(),
}));

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn().mockReturnValue(jest.fn()),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockToMountPoint = toMountPoint as jest.Mock;

describe('useSaveToLibrary hook', () => {
  const mockUnmount = jest.fn();
  const mockMount = jest.fn().mockReturnValue(mockUnmount);
  const mockStartServices = {
    application: { capabilities: { visualize_v2: { save: true } } },
    lens: { SaveModalComponent: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToMountPoint.mockReturnValue(mockMount);
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

  it('should use the mount cleanup callback when the save modal closes', () => {
    const { result } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );

    act(() => {
      result.current.openSaveVisualizationFlyout();
    });

    const saveModal = mockToMountPoint.mock.calls[0][0];

    act(() => {
      saveModal.props.onSave();
      saveModal.props.onClose();
    });

    expect(mockUnmount).toHaveBeenCalledTimes(2);
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
