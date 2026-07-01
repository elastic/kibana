/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIValue } from './ai_value';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useHasSecurityCapability } from '../../helper_hooks';
import { TestProviders } from '../../common/mock/test_providers';
import { AIValueReport } from '../components/ai_value';
import { useAIValueExportContext } from '../providers/ai_value/export_provider';
import { useDownloadAIValueReport } from '../hooks/use_download_ai_value_report';
import { SuperDatePicker } from '../../common/components/super_date_picker';

jest.mock('../../common/hooks/search_bar/use_sync_timerange_url_param', () => ({
  useSyncTimerangeUrlParam: jest.fn(),
}));

jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn(),
}));

jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(),
}));

jest.mock('../../helper_hooks', () => ({
  useHasSecurityCapability: jest.fn(),
}));

jest.mock('../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(),
  useShallowEqualSelector: jest.fn(),
}));

jest.mock('../providers/ai_value/export_provider', () => ({
  AIValueExportProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAIValueExportContext: jest.fn(),
}));

jest.mock('../hooks/use_download_ai_value_report', () => ({
  useDownloadAIValueReport: jest.fn(),
}));

jest.mock('../components/ai_value', () => ({
  AIValueReport: jest.fn(() => <div data-test-subj="ai-value-report" />),
}));

jest.mock('../../common/components/super_date_picker', () => ({
  SuperDatePicker: jest.fn(() => <div data-test-subj="mock-super-date-picker" />),
}));

jest.mock('../components/ai_value/value_report_exporter', () => ({
  ValueReportExporter: ({ children }: { children: (exportPDF: () => void) => React.ReactNode }) =>
    children(jest.fn()),
}));

jest.mock('../../common/components/no_privileges', () => ({
  NoPrivileges: () => <div data-test-subj="no-privileges" />,
}));

const mockUseDeepEqualSelector = useDeepEqualSelector as jest.MockedFunction<
  typeof useDeepEqualSelector
>;
const mockUseAlertsPrivileges = useAlertsPrivileges as jest.MockedFunction<
  typeof useAlertsPrivileges
>;
const mockUseDataView = useDataView as jest.MockedFunction<typeof useDataView>;
const mockUseHasSecurityCapability = useHasSecurityCapability as jest.MockedFunction<
  typeof useHasSecurityCapability
>;
const mockAIValueReport = AIValueReport as jest.MockedFunction<typeof AIValueReport>;
const mockUseAIValueExportContext = useAIValueExportContext as jest.Mock;
const mockUseDownloadAIValueReport = useDownloadAIValueReport as jest.MockedFunction<
  typeof useDownloadAIValueReport
>;
const mockSuperDatePicker = SuperDatePicker as jest.MockedFunction<typeof SuperDatePicker>;

const renderAIValue = () =>
  render(
    <TestProviders>
      <AIValue />
    </TestProviders>
  );

describe('AIValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeepEqualSelector.mockReturnValue({
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-31T23:59:59.999Z',
    });
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexRead: true,
      hasIndexUpdateDelete: false,
      hasAlertsRead: false,
      hasAlertsAll: false,
      hasAlertsUpdate: false,
      loading: false,
      isAuthenticated: true,
      hasEncryptionKey: true,
      hasIndexManage: false,
      hasIndexWrite: false,
      hasIndexMaintenance: false,
    });
    mockUseDataView.mockReturnValue({
      status: 'ready',
      dataView: {
        hasMatchedIndices: jest.fn(),
      } as never,
    });
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseAIValueExportContext.mockReturnValue({ isExportMode: false });
    mockUseDownloadAIValueReport.mockReturnValue({
      toggleContextMenu: jest.fn(),
      isExportEnabled: false,
    });
  });

  it('renders NoPrivileges when the user lacks the socManagement capability', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);

    renderAIValue();

    expect(screen.getByTestId('no-privileges')).toBeInTheDocument();
    expect(screen.queryByTestId('aiValuePage')).not.toBeInTheDocument();
  });

  it('renders the page with the header when the user has access', () => {
    renderAIValue();

    expect(screen.getByTestId('aiValuePage')).toBeInTheDocument();
    expect(screen.getByTestId('header-page')).toBeInTheDocument();
  });

  it('hides the header in export mode', () => {
    mockUseAIValueExportContext.mockReturnValue({ isExportMode: true });

    renderAIValue();

    expect(screen.getByTestId('aiValuePage')).toBeInTheDocument();
    expect(screen.queryByTestId('header-page')).not.toBeInTheDocument();
  });

  it('disables export button when there is no report data even if export integration is available', () => {
    mockUseDownloadAIValueReport.mockReturnValue({
      toggleContextMenu: jest.fn(),
      isExportEnabled: true,
    });

    renderAIValue();

    expect(screen.getByTestId('aiValueExportButton')).toBeDisabled();
  });

  describe('isSourcererLoading derivation', () => {
    const getLoadingProp = () => mockAIValueReport.mock.calls.at(-1)?.[0].isSourcererLoading;

    it('treats any non-ready data view status as loading', () => {
      mockUseDataView.mockReturnValue({ status: 'loading', dataView: {} as never });

      renderAIValue();

      expect(getLoadingProp()).toBe(true);
    });

    it('reports not loading when data view picker has status ready', () => {
      mockUseDataView.mockReturnValue({ status: 'ready', dataView: {} as never });

      renderAIValue();

      expect(getLoadingProp()).toBe(false);
    });
  });

  describe('date picker disabled state', () => {
    const getDisabledProp = () => mockSuperDatePicker.mock.calls.at(-1)?.[0].disabled;

    it('disables the date picker initially while report data loading state is unknown', () => {
      renderAIValue();

      // AIValueReport has not called setIsDatePickerDisabled(false) yet — stays at initial true
      expect(getDisabledProp()).toBe(true);
    });

    it('enables the date picker once the child reports data has loaded', () => {
      renderAIValue();

      // Simulate AIValueReport resolving the loading state
      const setIsDatePickerDisabled =
        mockAIValueReport.mock.calls.at(-1)?.[0].setIsDatePickerDisabled;
      act(() => {
        setIsDatePickerDisabled?.(false);
      });

      expect(getDisabledProp()).toBe(false);
    });
  });
});
