/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { render } from '../../../utils/testing';
import { AlertDefaultsForm } from './alert_defaults_form';
import type { DynamicSettings } from '../../../../../../common/runtime_types';

jest.mock('./hooks/use_alerting_defaults', () => ({
  useAlertingDefaults: () => ({
    connectors: [],
    options: [],
  }),
}));

const savedSettings: DynamicSettings = {
  ...DYNAMIC_SETTINGS_DEFAULTS,
  defaultStatusRuleEnabled: true,
  defaultTLSRuleEnabled: true,
};

const renderForm = (settings: DynamicSettings = savedSettings) =>
  render(<AlertDefaultsForm />, {
    state: {
      dynamicSettings: {
        loading: false,
        locationMonitors: [],
        settings,
        connectors: [],
      },
    },
  });

describe('<AlertDefaultsForm />', () => {
  it('explains that turning a default rule off deletes it', () => {
    renderForm();

    expect(
      screen.getByText(
        /Turning a default rule off deletes it, and its active alerts become untracked/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Custom synthetics rules are not affected/)).toBeInTheDocument();
  });

  it('warns before applying when the default status rule is disabled', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormStatusRuleSwitch'));
    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormApplyButton'));

    expect(screen.getByTestId('syntheticsDisableDefaultRuleConfirmModal')).toBeInTheDocument();
    expect(screen.getByText('Disable default status rule?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This deletes the default status rule. Active alerts from that rule become untracked.'
      )
    ).toBeInTheDocument();
  });

  it('warns before applying when the default TLS rule is disabled', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormTlsRuleSwitch'));
    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormApplyButton'));

    expect(screen.getByText('Disable default TLS rule?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This deletes the default TLS rule. Active alerts from that rule become untracked.'
      )
    ).toBeInTheDocument();
  });

  it('warns about both rules when status and TLS are disabled together', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormStatusRuleSwitch'));
    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormTlsRuleSwitch'));
    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormApplyButton'));

    expect(screen.getByText('Disable default status and TLS rules?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This deletes the default status and TLS rules. Active alerts from those rules become untracked.'
      )
    ).toBeInTheDocument();
  });

  it('keeps the form dirty when the disable confirmation is cancelled', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormStatusRuleSwitch'));
    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormApplyButton'));
    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(
      screen.queryByTestId('syntheticsDisableDefaultRuleConfirmModal')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAlertDefaultsFormApplyButton')).toBeEnabled();
  });

  it('does not warn when a disabled default rule is turned back on', () => {
    renderForm({
      ...savedSettings,
      defaultStatusRuleEnabled: false,
    });

    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormStatusRuleSwitch'));
    fireEvent.click(screen.getByTestId('syntheticsAlertDefaultsFormApplyButton'));

    expect(
      screen.queryByTestId('syntheticsDisableDefaultRuleConfirmModal')
    ).not.toBeInTheDocument();
  });
});
