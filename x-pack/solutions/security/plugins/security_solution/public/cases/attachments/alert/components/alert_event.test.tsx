/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AlertEvent } from './alert_event';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useFetchAlertData } from '../../../pages/use_fetch_alert_data';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';

const props = {
  alertId: 'alert-id',
  rule: { id: 'rule-id', name: 'Test Rule' },
  savedObjectId: 'saved-object-id',
  totalAlerts: 1,
};

const mockOpenFlyout = jest.fn();
const mockOpenSystemFlyout = jest.fn();

jest.mock('@kbn/expandable-flyout');

jest.mock('../../../pages/use_fetch_alert_data');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled');

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        overlays: {
          ...original.useKibana().services.overlays,
          openSystemFlyout: mockOpenSystemFlyout,
        },
      },
    }),
  };
});

jest.mock('../../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => children,
}));

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useFetchAlertDataMock = useFetchAlertData as jest.Mock;

const clickRuleLink = () => {
  fireEvent.click(screen.getByTestId(`alert-rule-link-${props.savedObjectId}`));
};

describe('AlertEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openFlyout: mockOpenFlyout });
    useFetchAlertDataMock.mockReturnValue([false, {}]);
    useUserPrivilegesMock.mockReturnValue({
      rulesPrivileges: {
        rules: { read: true, edit: false },
        exceptions: { read: false, crud: false },
      },
    });
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  it('renders the rule link', () => {
    render(
      <TestProviders>
        <AlertEvent {...props} />
      </TestProviders>
    );

    expect(screen.getByTestId(`alert-rule-link-${props.savedObjectId}`)).toBeInTheDocument();
  });

  it('opens the legacy rule flyout when the new flyout is disabled', () => {
    render(
      <TestProviders>
        <AlertEvent {...props} />
      </TestProviders>
    );

    clickRuleLink();

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: { id: 'rule-panel', params: { ruleId: 'rule-id' } },
    });
    expect(mockOpenSystemFlyout).not.toHaveBeenCalled();
  });

  it('opens the new rule flyout (system flyout) when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(
      <TestProviders>
        <AlertEvent {...props} />
      </TestProviders>
    );

    clickRuleLink();

    expect(mockOpenSystemFlyout).toHaveBeenCalled();
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });

  it('does not open any flyout when the user cannot read rules', () => {
    useUserPrivilegesMock.mockReturnValue({
      rulesPrivileges: {
        rules: { read: false, edit: false },
        exceptions: { read: false, crud: false },
      },
    });

    render(
      <TestProviders>
        <AlertEvent {...props} />
      </TestProviders>
    );

    clickRuleLink();

    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(mockOpenSystemFlyout).not.toHaveBeenCalled();
  });
});
