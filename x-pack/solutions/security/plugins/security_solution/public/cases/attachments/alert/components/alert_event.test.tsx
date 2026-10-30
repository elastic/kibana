/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { AlertEvent } from './alert_event';
import { TestProviders } from '../../../../common/mock';
import { createExpandableFlyoutApiMock } from '../../../../common/mock/expandable_flyout';
import { useFetchAlertData } from '../../../pages/use_fetch_alert_data';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { RulePanelKey } from '../../../../flyout/rule_details/right';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../pages/use_fetch_alert_data');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled');
jest.mock('../../../../flyout_v2/use_flyout_api');

const savedObjectId = 'so1';
const defaultProps = {
  alertId: 'a1',
  totalAlerts: 1,
  savedObjectId,
  rule: { id: 'rule-1', name: 'My rule' },
};

const ruleLinkTestId = `alert-rule-link-${savedObjectId}`;

describe('AlertEvent', () => {
  const flyoutApi = createFlyoutApiMock();
  const mockOpenFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useFetchAlertData as jest.Mock).mockReturnValue([false, {}, null]);
    (useAlertsPrivileges as jest.Mock).mockReturnValue({
      loading: false,
      hasAlertsRead: true,
      hasAlertsAll: true,
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      rulesPrivileges: { rules: { read: true } },
    });
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });
  });

  it('renders the rule link with the resolved rule name', () => {
    render(
      <TestProviders>
        <AlertEvent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId(ruleLinkTestId)).toHaveTextContent('My rule');
  });

  it('opens the legacy expandable flyout when the new flyout is disabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);

    render(
      <TestProviders>
        <AlertEvent {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId(ruleLinkTestId));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: RulePanelKey,
        params: { ruleId: 'rule-1' },
      },
    });
    expect(flyoutApi.openRuleFlyout).not.toHaveBeenCalled();
  });

  it('opens the new rule flyout when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(
      <TestProviders>
        <AlertEvent {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId(ruleLinkTestId));

    expect(flyoutApi.openRuleFlyout).toHaveBeenCalledWith({
      ruleId: 'rule-1',
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      title: 'Rule: My rule',
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });

  it('does not open any flyout when the user cannot read rules', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      rulesPrivileges: { rules: { read: false } },
    });

    render(
      <TestProviders>
        <AlertEvent {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId(ruleLinkTestId));

    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(flyoutApi.openRuleFlyout).not.toHaveBeenCalled();
  });

  describe('while alert privileges are loading', () => {
    it('shows spinner instead of "Unknown rule" when privileges have not resolved yet', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({
        loading: true,
        hasAlertsRead: false,
        hasAlertsAll: false,
      });
      (useFetchAlertData as jest.Mock).mockReturnValue([false, {}, null]);

      const { container } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
      expect(screen.queryByText('Unknown rule')).not.toBeInTheDocument();
    });
  });

  describe('when the user cannot read alerts', () => {
    it('shows "Unknown rule" instead of an infinite spinner when the fetch is permanently skipped', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({
        loading: false,
        hasAlertsRead: false,
        hasAlertsAll: false,
      });
      // useQueryAlerts is skipped → refetch stays null forever; must not produce a permanent spinner
      (useFetchAlertData as jest.Mock).mockReturnValue([false, {}, null]);

      const { container } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(screen.getByTestId(`alerts-user-action-${savedObjectId}`)).toHaveTextContent(
        'Unknown rule'
      );
      expect(container.querySelector('[class*="euiLoadingSpinner"]')).not.toBeInTheDocument();
    });
  });

  describe('when rule info is absent from metadata (live fetch required)', () => {
    it('shows spinner on initial render before the fetch starts (loadingAlertData=false, no data)', () => {
      // useFetchAlertData starts with loading=false before useQueryAlerts fires its fetch effect.
      // refetchAlertData=null (the initial value before any fetch completes) signals this state,
      // so the spinner shows rather than "Unknown rule".
      (useFetchAlertData as jest.Mock).mockReturnValue([false, {}, null]);

      const { container } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
      expect(screen.queryByText('Unknown rule')).not.toBeInTheDocument();
    });

    it('shows spinner while the fetch is in progress', () => {
      (useFetchAlertData as jest.Mock).mockReturnValue([true, {}, null]);

      const { container } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
    });

    it('shows spinner (not "Unknown rule") when first fetch returns no data and retry is pending', () => {
      // Simulate: loading went true then false with no data — firstFetchReturnedNoData=true.
      const mockUseFetchAlertData = useFetchAlertData as jest.Mock;
      const mockRefetch = jest.fn();

      mockUseFetchAlertData.mockReturnValueOnce([true, {}, mockRefetch]);
      mockUseFetchAlertData.mockReturnValue([false, {}, mockRefetch]);

      const { rerender, container } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();

      rerender(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      // firstFetchReturnedNoData=true → spinner still up, retry scheduled
      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
      expect(screen.queryByText('Unknown rule')).not.toBeInTheDocument();
    });

    it('resolves the rule name when the retry fetch returns alert data', () => {
      jest.useFakeTimers();
      const mockUseFetchAlertData = useFetchAlertData as jest.Mock;
      const mockRefetch = jest.fn();

      // First fetch: in progress, then completes with no data
      mockUseFetchAlertData.mockReturnValueOnce([true, {}, mockRefetch]);
      mockUseFetchAlertData.mockReturnValue([false, {}, mockRefetch]);

      const { rerender } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} alertId="a1" rule={{ id: null, name: null }} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertEvent {...defaultProps} alertId="a1" rule={{ id: null, name: null }} />
        </TestProviders>
      );

      // Retry fires; hook now returns alert data for a1
      jest.advanceTimersByTime(300);
      mockUseFetchAlertData.mockReturnValue([
        false,
        {
          a1: { 'kibana.alert.rule.uuid': 'rule-id-1', 'kibana.alert.rule.name': 'Recovered rule' },
        },
        mockRefetch,
      ]);
      rerender(
        <TestProviders>
          <AlertEvent {...defaultProps} alertId="a1" rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(screen.getByTestId(`alerts-user-action-${savedObjectId}`)).toHaveTextContent(
        'Recovered rule'
      );

      jest.useRealTimers();
    });

    it('renders "Unknown rule" after fetch + retry both return no matching alert data', () => {
      jest.useFakeTimers();
      const mockUseFetchAlertData = useFetchAlertData as jest.Mock;
      const mockRefetch = jest.fn();

      // First fetch: in progress, then completes with no data
      mockUseFetchAlertData.mockReturnValueOnce([true, {}, mockRefetch]);
      mockUseFetchAlertData.mockReturnValue([false, {}, mockRefetch]);

      const { rerender, container } = render(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      // loading=true → spinner
      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();

      // First fetch completes with no data → spinner (firstFetchReturnedNoData=true, retry pending)
      rerender(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );
      expect(container.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();

      // Advance timer to fire the retry
      jest.advanceTimersByTime(300);
      expect(mockRefetch).toHaveBeenCalledTimes(1);

      // Retry also returns no data. refetchAlertData stays non-null (useQueryAlerts never resets
      // refetch to null after the first fetch). hasRetried.current=true → firstFetchReturnedNoData=false.
      mockUseFetchAlertData.mockReturnValue([false, {}, mockRefetch]);
      rerender(
        <TestProviders>
          <AlertEvent {...defaultProps} rule={{ id: null, name: null }} />
        </TestProviders>
      );

      expect(screen.getByTestId(`alerts-user-action-${savedObjectId}`)).toHaveTextContent(
        'Unknown rule'
      );

      jest.useRealTimers();
    });
  });

  describe('when the alert is a linked/remote (CPS) alert', () => {
    it('renders the rule name as plain text instead of a clickable link', () => {
      render(
        <TestProviders>
          <AlertEvent {...defaultProps} isRemoteAlert={true} />
        </TestProviders>
      );

      // the rule name is still displayed within the user action title
      expect(screen.getByTestId(`alerts-user-action-${savedObjectId}`)).toHaveTextContent(
        'My rule'
      );
      // but it is no longer rendered as a clickable link
      expect(screen.queryByTestId(ruleLinkTestId)).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('does not open any flyout when the rule name is clicked', () => {
      render(
        <TestProviders>
          <AlertEvent {...defaultProps} isRemoteAlert={true} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId(`alerts-user-action-${savedObjectId}`));

      expect(mockOpenFlyout).not.toHaveBeenCalled();
      expect(flyoutApi.openRuleFlyout).not.toHaveBeenCalled();
    });
  });
});
