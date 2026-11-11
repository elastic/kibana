/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MetricsHeaderActionMenu } from './metrics_header_action_menu';

const mockGetRedirectUrl = jest.fn(() => '/app/observabilityOnboarding');

const mockMlVisibility = {
  isTopbarMenuVisible: true,
};

const mockAnomalyFlyoutCapture: {
  hideJobType?: boolean;
  hideSelectGroup?: boolean;
} = {};

jest.mock('../../../containers/plugin_config_context', () => ({
  usePluginConfig: () => ({
    featureFlags: { alertsAndRulesDropdownEnabled: true },
  }),
}));

jest.mock('../../../containers/ml/infra_ml_capabilities', () => ({
  useInfraMLCapabilitiesContext: () => mockMlVisibility,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
          },
        },
      },
    },
  }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useLinkProps: () => ({ href: '/app/metrics/settings' }),
}));

jest.mock('../../../components/ml/anomaly_detection/anomaly_detection_flyout', () => ({
  AnomalyDetectionFlyout: (props: { hideJobType?: boolean; hideSelectGroup?: boolean }) => {
    mockAnomalyFlyoutCapture.hideJobType = props.hideJobType;
    mockAnomalyFlyoutCapture.hideSelectGroup = props.hideSelectGroup;
    return null;
  },
}));

jest.mock('../../../alerting/common/components/metrics_alert_dropdown', () => ({
  MetricsAlertDropdown: () => null,
}));

jest.mock('../../../components/inspector_header_link', () => ({
  InspectorHeaderLink: () => null,
}));

function renderMenu(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <MetricsHeaderActionMenu />
    </MemoryRouter>
  );
}

describe('MetricsHeaderActionMenu', () => {
  beforeEach(() => {
    mockGetRedirectUrl.mockClear();
    mockMlVisibility.isTopbarMenuVisible = true;
    delete mockAnomalyFlyoutCapture.hideJobType;
    delete mockAnomalyFlyoutCapture.hideSelectGroup;
  });

  it('shows anomaly pickers on Inventory and uses infra add-data', () => {
    renderMenu('/inventory');

    expect(mockAnomalyFlyoutCapture).toEqual({
      hideJobType: false,
      hideSelectGroup: false,
    });
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: undefined });
  });

  it('hides anomaly pickers on Hosts and uses host add-data', () => {
    renderMenu('/hosts');

    expect(mockAnomalyFlyoutCapture).toEqual({
      hideJobType: true,
      hideSelectGroup: true,
    });
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: 'host' });
  });

  it('treats host detail like Hosts', () => {
    renderMenu('/detail/host/web-01');

    expect(mockAnomalyFlyoutCapture).toEqual({
      hideJobType: true,
      hideSelectGroup: true,
    });
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: 'host' });
  });

  it('omits anomaly detection on Explorer and uses infra add-data', () => {
    renderMenu('/explorer');

    expect(mockAnomalyFlyoutCapture.hideJobType).toBeUndefined();
    expect(mockAnomalyFlyoutCapture.hideSelectGroup).toBeUndefined();
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: undefined });
  });

  it('omits anomaly detection when the ML topbar is hidden', () => {
    mockMlVisibility.isTopbarMenuVisible = false;
    renderMenu('/hosts');

    expect(mockAnomalyFlyoutCapture.hideJobType).toBeUndefined();
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: 'host' });
  });
});
