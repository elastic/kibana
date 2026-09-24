/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildSnoozeSummary } from '@kbn/response-ops-alert-snooze';
import type { SnoozeCondition } from '@kbn/response-ops-alert-snooze';
import type { TopAlert } from '../../../typings/alerts';
import { useAlertSnoozeState } from '../hooks/use_alert_snooze_state';
import { AlertSnoozeStatus } from './alert_snooze_status';

jest.mock('../hooks/use_alert_snooze_state');

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

const alert = {} as TopAlert;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const renderComponent = () => render(<AlertSnoozeStatus alert={alert} />, { wrapper });

describe('AlertSnoozeStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAlertSnoozeStateMock.mockReturnValue(notSnoozedState);
  });

  it('renders nothing when the alert is neither muted nor snoozed', () => {
    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('alertSnoozedBadge')).not.toBeInTheDocument();
  });

  it('renders the badge with an indefinite summary when the alert is muted', async () => {
    useAlertSnoozeStateMock.mockReturnValue({ ...notSnoozedState, isMuted: true });

    renderComponent();

    const badge = screen.getByTestId('alertSnoozedBadge');
    expect(badge).toBeInTheDocument();

    const summary = buildSnoozeSummary({ isMuted: true, expiresAt: null });
    fireEvent.mouseOver(badge);
    expect(await screen.findByText(summary)).toBeInTheDocument();
  });

  it('ignores the instance expiry/conditions when the alert is muted', async () => {
    const snoozedInstance = {
      instanceId: 'instance-1',
      expiresAt: '2026-05-16T00:00:00.000Z',
      conditions: [{ type: 'field_change', field: 'host.name' }] as SnoozeCondition[],
      conditionOperator: 'any',
    };
    useAlertSnoozeStateMock.mockReturnValue({ ...notSnoozedState, isMuted: true, snoozedInstance });

    renderComponent();

    const badge = screen.getByTestId('alertSnoozedBadge');
    fireEvent.mouseOver(badge);
    expect(
      await screen.findByText(buildSnoozeSummary({ isMuted: true, expiresAt: null }))
    ).toBeInTheDocument();
  });

  it('renders the badge with the expiry summary when the alert is snoozed until a date', async () => {
    const snoozedInstance = {
      instanceId: 'instance-1',
      expiresAt: '2026-05-16T00:00:00.000Z',
    };
    useAlertSnoozeStateMock.mockReturnValue({
      ...notSnoozedState,
      isSnoozed: true,
      snoozedInstance,
    });

    renderComponent();

    const badge = screen.getByTestId('alertSnoozedBadge');
    expect(badge).toBeInTheDocument();

    const summary = buildSnoozeSummary({ isMuted: false, expiresAt: snoozedInstance.expiresAt });
    fireEvent.mouseOver(badge);
    expect(await screen.findByText(summary)).toBeInTheDocument();
  });

  it('renders the badge with a condition summary when the alert is snoozed by conditions', async () => {
    const conditions: SnoozeCondition[] = [{ type: 'field_change', field: 'host.name' }];
    const snoozedInstance = {
      instanceId: 'instance-1',
      expiresAt: null,
      conditions,
      conditionOperator: 'any',
    };
    useAlertSnoozeStateMock.mockReturnValue({
      ...notSnoozedState,
      isSnoozed: true,
      snoozedInstance,
    });

    renderComponent();

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
