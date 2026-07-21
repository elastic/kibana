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
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { RulePanelKey } from '../../../../flyout/rule_details/right';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../pages/use_fetch_alert_data');
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
    (useFetchAlertData as jest.Mock).mockReturnValue([false, {}]);
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
});
