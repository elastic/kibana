/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import {
  HomePageStatPanel,
  type HomePageStatPanelAction,
  type HomePageStatPanelMetric,
} from './home_page_stat_panel';

const metric = (overrides: Partial<HomePageStatPanelMetric> = {}): HomePageStatPanelMetric => ({
  key: 'total',
  label: 'Total',
  value: '12',
  isLoading: false,
  ...overrides,
});

const action = (overrides: Partial<HomePageStatPanelAction> = {}): HomePageStatPanelAction => ({
  key: 'create',
  iconType: 'plusCircle',
  label: 'Create a dashboard',
  onClick: jest.fn(),
  testSubj: 'createDashboardAction',
  telemetryId: 'createDashboardTelemetryId',
  ...overrides,
});

const renderPanel = (props: Partial<React.ComponentProps<typeof HomePageStatPanel>> = {}) =>
  render(
    <HomePageStatPanel
      iconType="productDashboard"
      title="Dashboards"
      testSubj="dashboardsCard"
      metrics={[metric()]}
      actions={[action()]}
      {...props}
    />
  );

// EuiPopover positions itself asynchronously once opened, so let that settle before asserting.
const openActionsMenu = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('dashboardsCardActionsButton'));
  });
};

describe('HomePageStatPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metrics', () => {
    it('shows a loading placeholder instead of the value while a metric is loading', () => {
      renderPanel({
        metrics: [
          metric({ key: 'total', label: 'Total', value: '12', isLoading: true }),
          metric({ key: 'starred', label: 'Starred', value: '3', isLoading: false }),
        ],
      });

      // the label stays visible so the panel does not reflow once the value lands
      expect(screen.getByTestId('dashboardsCard-total-label')).toHaveTextContent('Total');
      expect(screen.getByTestId('dashboardsCard-total-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboardsCard-total-value')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboardsCard-starred-value')).toHaveTextContent('3');
    });
  });

  describe('actions', () => {
    it('puts every action behind the overflow menu by default', async () => {
      const onCreate = jest.fn();
      renderPanel({ actions: [action({ onClick: onCreate })] });

      expect(screen.queryByTestId('createDashboardAction')).not.toBeInTheDocument();

      await openActionsMenu();
      fireEvent.click(screen.getByTestId('createDashboardAction'));

      expect(onCreate).toHaveBeenCalled();
    });

    it('promotes the first action to a button when showPrimary is set', async () => {
      const onCreate = jest.fn();
      const onManage = jest.fn();
      renderPanel({
        showPrimary: true,
        actions: [
          action({ key: 'create', label: 'Create a dashboard', onClick: onCreate }),
          action({
            key: 'manage',
            label: 'Manage dashboards',
            onClick: onManage,
            testSubj: 'manageDashboardsAction',
          }),
        ],
      });

      fireEvent.click(screen.getByTestId('createDashboardAction'));
      expect(onCreate).toHaveBeenCalled();

      // the promoted action is not repeated inside the overflow menu
      await openActionsMenu();
      expect(screen.getAllByTestId('createDashboardAction')).toHaveLength(1);
      expect(screen.getByTestId('manageDashboardsAction')).toBeInTheDocument();
    });

    it('omits the overflow menu when the only action has been promoted', () => {
      renderPanel({ showPrimary: true, actions: [action()] });

      expect(screen.getByTestId('createDashboardAction')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboardsCardActionsButton')).not.toBeInTheDocument();
    });

    it('renders no action controls when there are no actions', () => {
      renderPanel({ actions: [] });

      expect(screen.queryByTestId('dashboardsCardActionsButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('createDashboardAction')).not.toBeInTheDocument();
    });

    it('closes the overflow menu after an item is selected', async () => {
      renderPanel({
        actions: [
          action({ key: 'create', label: 'Create a dashboard' }),
          action({ key: 'manage', label: 'Manage dashboards', testSubj: 'manageDashboardsAction' }),
        ],
      });

      await openActionsMenu();
      const item = screen.getByTestId('manageDashboardsAction');
      fireEvent.click(item);

      await waitForElementToBeRemoved(item);
    });
  });
});
