/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_STATUS, ALERT_STATUS_RECOVERED, ALERT_STATUS_UNTRACKED } from '@kbn/rule-data-utils';
import { buildSnoozeSummary } from '@kbn/response-ops-alert-snooze';
import type { SnoozeCondition } from '@kbn/response-ops-alert-snooze';
import { render } from '../../../utils/test_helper';
import { alertWithGroupsAndTags } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { useAlertSnoozeState } from '../hooks/use_alert_snooze_state';
import type { StatusBarProps } from './status_bar';
import { StatusBar } from './status_bar';

jest.mock('../../../utils/kibana_react');
jest.mock('../hooks/use_alert_snooze_state');

const useKibanaMock = useKibana as jest.Mock;
const useAlertSnoozeStateMock = useAlertSnoozeState as jest.Mock;

const notSnoozedState = {
  ruleId: 'rule-1',
  instanceId: 'instance-1',
  isMuted: false,
  isSnoozed: false,
  snoozedInstance: undefined,
  refetch: jest.fn(),
  isLoading: false,
};
const unsubscribeMock = jest.fn();
const subscribeMock = jest.fn().mockReturnValue({ unsubscribe: unsubscribeMock });
const mockSpaces = {
  getActiveSpace$: jest.fn().mockReturnValue({
    subscribe: subscribeMock,
    pipe: () => ({
      subscribe: subscribeMock,
    }),
  }),
};
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
      spaces: mockSpaces,
    },
  });
};

describe('Source bar', () => {
  const renderComponent = (props: StatusBarProps) => {
    return render(<StatusBar {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    useAlertSnoozeStateMock.mockReturnValue(notSnoozedState);
  });

  it('should show alert data', async () => {
    const statusBar = renderComponent({
      alert: alertWithGroupsAndTags,
      alertStatus: alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus,
    });

    expect(statusBar.getByText('Active')).toBeTruthy();
  });

  it('should display a recovered badge when alert is recovered', async () => {
    const updatedProps = {
      alert: {
        ...alertWithGroupsAndTags,
        fields: {
          ...alertWithGroupsAndTags.fields,
          [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
        },
      },
      alertStatus: ALERT_STATUS_RECOVERED as AlertStatus,
    };

    const { getByText } = renderComponent({ ...updatedProps });
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('should display an untracked badge when alert is untracked', async () => {
    const updatedProps = {
      alert: {
        ...alertWithGroupsAndTags,
        fields: {
          ...alertWithGroupsAndTags.fields,
          [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
        },
      },
      alertStatus: ALERT_STATUS_UNTRACKED as AlertStatus,
    };

    const { getByText } = renderComponent({ ...updatedProps });
    expect(getByText('Untracked')).toBeTruthy();
  });

  describe('snooze details', () => {
    const alertStatus = alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus;

    it('does not render the snooze badge when the alert is neither muted nor snoozed', () => {
      renderComponent({ alert: alertWithGroupsAndTags, alertStatus });

      expect(screen.queryByTestId('alertSnoozedBadge')).not.toBeInTheDocument();
    });

    it('renders the snooze badge with an indefinite summary when the alert is muted', async () => {
      useAlertSnoozeStateMock.mockReturnValue({ ...notSnoozedState, isMuted: true });

      renderComponent({ alert: alertWithGroupsAndTags, alertStatus });

      const badge = screen.getByTestId('alertSnoozedBadge');
      expect(badge).toBeInTheDocument();

      const summary = buildSnoozeSummary({ isMuted: true, expiresAt: null });
      fireEvent.mouseOver(badge);
      expect(await screen.findByText(summary)).toBeInTheDocument();
    });

    it('renders the snooze badge with the expiry summary when the alert is snoozed until a date', async () => {
      const snoozedInstance = {
        instanceId: 'instance-1',
        snoozedAt: '2026-05-15T00:00:00.000Z',
        snoozedBy: 'user1',
        expiresAt: '2026-05-16T00:00:00.000Z',
      };
      useAlertSnoozeStateMock.mockReturnValue({
        ...notSnoozedState,
        isSnoozed: true,
        snoozedInstance,
      });

      renderComponent({ alert: alertWithGroupsAndTags, alertStatus });

      const badge = screen.getByTestId('alertSnoozedBadge');
      expect(badge).toBeInTheDocument();

      const summary = buildSnoozeSummary({ isMuted: false, expiresAt: snoozedInstance.expiresAt });
      fireEvent.mouseOver(badge);
      expect(await screen.findByText(summary)).toBeInTheDocument();
    });

    it('renders the snooze badge with a condition summary when the alert is snoozed by conditions', async () => {
      const conditions: SnoozeCondition[] = [{ type: 'field_change', field: 'host.name' }];
      const snoozedInstance = {
        instanceId: 'instance-1',
        snoozedAt: '2026-05-15T00:00:00.000Z',
        snoozedBy: 'user1',
        expiresAt: null,
        conditions,
        conditionOperator: 'any',
      };
      useAlertSnoozeStateMock.mockReturnValue({
        ...notSnoozedState,
        isSnoozed: true,
        snoozedInstance,
      });

      renderComponent({ alert: alertWithGroupsAndTags, alertStatus });

      const badge = screen.getByTestId('alertSnoozedBadge');
      expect(badge).toBeInTheDocument();

      const summary = buildSnoozeSummary({
        isMuted: false,
        expiresAt: null,
        conditions,
        conditionOperator: 'any',
      });
      fireEvent.mouseOver(badge);
      expect(await screen.findByText(summary)).toBeInTheDocument();
    });
  });
});
