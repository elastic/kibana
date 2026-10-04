/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { AlertsSummaryContent } from './alerts';
import { usePluginConfig } from '../../../../../containers/plugin_config_context';
import { useAssetDetailsRenderPropsContext } from '../../../hooks/use_asset_details_render_props';
import { useIntegrationCheck } from '../../../hooks/use_integration_check';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { INTEGRATIONS } from '../../../constants';

jest.mock('../../../../../containers/plugin_config_context');
jest.mock('../../../hooks/use_asset_details_render_props');
jest.mock('../../../hooks/use_integration_check');
jest.mock('../../../../../hooks/use_kibana');

// The alerts table owns its own data fetching; the stub exposes the two outcomes the section
// reacts to, so the test drives the collapse behavior without a search request.
jest.mock('../../../../shared/alerts/alerts_overview', () => ({
  AlertsOverview: ({
    onLoaded,
  }: {
    onLoaded: (alertsCount?: { activeAlertCount: number }) => void;
  }) => (
    <div data-test-subj="hostsView-alerts">
      <button
        type="button"
        data-test-subj="reportNoActiveAlerts"
        onClick={() => onLoaded({ activeAlertCount: 0 })}
      />
      <button
        type="button"
        data-test-subj="reportActiveAlerts"
        onClick={() => onLoaded({ activeAlertCount: 2 })}
      />
    </div>
  ),
}));

jest.mock('../../../../../alerting/inventory/components/alert_flyout', () => ({
  AlertFlyout: ({ visible }: { visible: boolean }) =>
    visible ? <div data-test-subj="infraAssetDetailsAlertFlyout" /> : null,
}));

const usePluginConfigMock = usePluginConfig as jest.MockedFunction<typeof usePluginConfig>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;
const useIntegrationCheckMock = useIntegrationCheck as jest.MockedFunction<
  typeof useIntegrationCheck
>;
const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

const SHOW_ALL_TEST_SUBJ = 'infraAssetDetailsAlertsTabAlertsShowAllButton';
const CREATE_RULE_TEST_SUBJ = 'infraAssetDetailsAlertsTabCreateAlertsRuleButton';
const COLLAPSE_EXPAND_TEST_SUBJ = 'infraAssetDetailsCollapseExpandSection';

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const mockFeatureFlags = (inventoryThresholdAlertRuleEnabled = true) => {
  usePluginConfigMock.mockReturnValue({
    featureFlags: { inventoryThresholdAlertRuleEnabled },
  } as unknown as ReturnType<typeof usePluginConfig>);
};

const mockIntegrations = (integrations: string[]) => {
  useIntegrationCheckMock.mockImplementation(({ dependsOn }) => integrations.includes(dependsOn));
};

const renderAlerts = (entityType: InventoryItemType = 'host') =>
  render(
    <I18nProvider>
      <AlertsSummaryContent entityId="host-1" entityType={entityType} dateRange={dateRange} />
    </I18nProvider>
  );

describe('AlertsSummaryContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFeatureFlags();
    mockIntegrations([]);
    useAssetDetailsRenderPropsContextMock.mockReturnValue({
      overrides: undefined,
      schema: 'ecs',
    } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
    useKibanaMock.mockReturnValue({
      services: coreMock.createStart(),
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
  });

  it('renders the alerts content with the Show all and Create rule actions', () => {
    renderAlerts();

    expect(screen.getByTestId('hostsView-alerts')).toBeInTheDocument();
    expect(screen.getByTestId(SHOW_ALL_TEST_SUBJ)).toBeVisible();
    expect(screen.getByTestId(CREATE_RULE_TEST_SUBJ)).toBeVisible();
  });

  it('collapses the section and reports no active alerts when the alerts request comes back empty', async () => {
    renderAlerts();

    await userEvent.click(screen.getByTestId('reportNoActiveAlerts'));

    expect(screen.getByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).toHaveAttribute(
      'data-section-state',
      'closed'
    );
    expect(screen.getByTestId('infraAssetDetailsAlertsClosedContentNoAlerts')).toBeInTheDocument();
  });

  it('keeps the section expanded when there are active alerts', async () => {
    renderAlerts();

    await userEvent.click(screen.getByTestId('reportActiveAlerts'));

    expect(screen.getByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).toHaveAttribute(
      'data-section-state',
      'open'
    );
    expect(
      screen.queryByTestId('infraAssetDetailsAlertsClosedContentNoAlerts')
    ).not.toBeInTheDocument();
  });

  it('shows the active alert count once the section is collapsed', async () => {
    renderAlerts();

    await userEvent.click(screen.getByTestId('reportActiveAlerts'));
    await userEvent.click(screen.getByTestId('infraAssetDetailsAlertsCollapsible'));

    expect(screen.getByTestId('infraAssetDetailsAlertsClosedContentWithAlerts')).toHaveTextContent(
      '2'
    );
  });

  it('omits the Create rule action when the inventory threshold rule feature is disabled', () => {
    mockFeatureFlags(false);
    renderAlerts();

    expect(screen.queryByTestId(CREATE_RULE_TEST_SUBJ)).not.toBeInTheDocument();
    expect(screen.getByTestId(SHOW_ALL_TEST_SUBJ)).toBeVisible();
  });

  it('omits the Create rule action for a container without the Docker integration', () => {
    renderAlerts('container');

    expect(screen.queryByTestId(CREATE_RULE_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('keeps the Create rule action for a Docker container', () => {
    mockIntegrations([INTEGRATIONS.docker]);
    renderAlerts('container');

    expect(screen.getByTestId(CREATE_RULE_TEST_SUBJ)).toBeVisible();
  });

  it('opens the alert rule flyout when Create rule is clicked', async () => {
    renderAlerts();

    expect(screen.queryByTestId('infraAssetDetailsAlertFlyout')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId(CREATE_RULE_TEST_SUBJ));

    expect(screen.getByTestId('infraAssetDetailsAlertFlyout')).toBeInTheDocument();
  });
});
