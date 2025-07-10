/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityAnalyticsManagementPage } from './entity_analytics_management_page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    mockAddSuccess,
    mockAddError,
  }),
}));

jest.mock('../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchRiskEngineSettings: () => undefined,
    fetchRiskEngineStatus: () => undefined,
  }),
}));

jest.mock('../hooks/use_missing_risk_engine_privileges', () => ({
  useMissingRiskEnginePrivileges: () => ({ isLoading: false, hasAllRequiredPrivileges: true }),
}));

jest.mock('../api/hooks/use_risk_engine_status', () => ({
  useRiskEngineStatus: () => ({
    data: {
      risk_engine_status: 'NOT_INSTALLED',
    },
    isFetching: false,
  }),
}));

jest.mock('../api/hooks/use_schedule_now_risk_engine_mutation', () => ({
  useScheduleNowRiskEngineMutation: () => ({
    mutate: () => {},
  }),
}));

const mockToggleSelectedClosedAlertsSetting = jest.fn();

const mockUseConfigurableRiskEngineSettings = jest.fn();

jest.mock(
  '../components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks',
  () => ({
    useConfigurableRiskEngineSettings: () => mockUseConfigurableRiskEngineSettings(),
  })
);

jest.mock('../components/risk_score_management/risk_score_enable_section', () => ({
  RiskScoreEnableSection: () => 'Risk score enable section',
}));
jest.mock('../components/risk_score_management/risk_score_useful_links_section', () => ({
  RiskScoreUsefulLinksSection: () => 'Useful links',
}));
const mockRiskScorePreviewSection = jest.fn().mockReturnValue(<p>{'Risk score preview'}</p>);
jest.mock('../components/risk_score_management/risk_score_preview_section', () => ({
  RiskScorePreviewSection: (props: never) => mockRiskScorePreviewSection(props),
}));

describe('EntityAnalyticsManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfigurableRiskEngineSettings.mockReturnValue({
      selectedRiskEngineSettings: {
        includeClosedAlerts: false,
        range: {
          start: 'now-30d',
          end: 'now',
        },
      },
      savedRiskEngineSettings: {
        includeClosedAlerts: false,
        range: {
          start: 'now-30d',
          end: 'now',
        },
      },
      selectedSettingsMatchSavedSettings: true,
      resetSelectedSettings: () => {},
      saveSelectedSettingsMutation: {
        mutateAsync: () => {},
      },
      setSelectedDateSetting: () => {},
      toggleSelectedClosedAlertsSetting: mockToggleSelectedClosedAlertsSetting,
      isLoadingRiskEngineSettings: false,
      isLoadingSaveSelectedSettings: false,
    });
  });

  const pageComponent = () => (
    <QueryClientProvider client={new QueryClient()}>
      <EntityAnalyticsManagementPage />
    </QueryClientProvider>
  );

  it('has the major sections of the page visible', () => {
    render(pageComponent());
    expect(screen.getByText('Entity risk score')).toBeInTheDocument();
    expect(screen.getByText('Risk score enable section')).toBeInTheDocument();
    expect(screen.getByText('Risk score preview')).toBeInTheDocument();
  });

  it('toggles the save bar when making changes to the closed alerts toggle', () => {
    const { rerender } = render(pageComponent());

    expect(screen.queryByText('Save')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('includeClosedAlertsSwitch'));
    expect(mockToggleSelectedClosedAlertsSetting).toHaveBeenCalled();

    mockUseConfigurableRiskEngineSettings.mockReturnValue({
      ...mockUseConfigurableRiskEngineSettings(),
      selectedSettingsMatchSavedSettings: false,
      selectedRiskEngineSettings: {
        includeClosedAlerts: true,
        range: {
          start: 'now-30d',
          end: 'now',
        },
      },
    });
    rerender(pageComponent());
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls the preview section with the toggle button selection as it changes', () => {
    const { rerender } = render(pageComponent());

    expect(mockRiskScorePreviewSection).toHaveBeenCalledWith({
      from: 'now-30d',
      to: 'now',
      includeClosedAlerts: false,
      privileges: {
        hasAllRequiredPrivileges: true,
        isLoading: false,
      },
    });

    fireEvent.click(screen.getByTestId('includeClosedAlertsSwitch'));
    expect(mockToggleSelectedClosedAlertsSetting).toHaveBeenCalled();

    mockUseConfigurableRiskEngineSettings.mockReturnValue({
      ...mockUseConfigurableRiskEngineSettings(),
      selectedSettingsMatchSavedSettings: false,
      selectedRiskEngineSettings: {
        includeClosedAlerts: true,
        range: {
          start: 'now-30d',
          end: 'now',
        },
      },
    });
    rerender(pageComponent());
    expect(mockRiskScorePreviewSection).toHaveBeenCalledWith({
      from: 'now-30d',
      to: 'now',
      includeClosedAlerts: true,
      privileges: {
        hasAllRequiredPrivileges: true,
        isLoading: false,
      },
    });
  });
});
