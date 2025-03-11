/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DefineAlertConnectors } from './define_connectors';
import { screen, fireEvent } from '@testing-library/react';
import { ENABLE_STATUS_ALERT } from './translations';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('EnableAlertComponent', () => {
  it('does not showHelpText or render popover when showHelpText and renderPopOver are false', () => {
    render(<DefineAlertConnectors />);
    expect(screen.getByTestId('uptimeDisplayDefineConnector')).toBeInTheDocument();
    expect(screen.queryByText(ENABLE_STATUS_ALERT)).not.toBeInTheDocument();
    expect(screen.queryByText(/Define a default connector/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('uptimeDisplayDefineConnector'));

    expect(screen.queryByTestId('uptimeSettingsDefineConnector')).toBeInTheDocument();
  });

  it('shows label when showLabel is true', () => {
    render(<DefineAlertConnectors />);
    expect(screen.getByLabelText(ENABLE_STATUS_ALERT)).toBeInTheDocument();
  });

  it('shows helpText when showHelpText is true', () => {
    render(<DefineAlertConnectors />);
    fireEvent.click(screen.getByTestId('uptimeDisplayDefineConnector'));

    expect(screen.getByText(/Define a default connector/)).toBeInTheDocument();
  });

  it('renders popover on click when showPopover is true', () => {
    render(<DefineAlertConnectors />);

    fireEvent.click(screen.getByTestId('uptimeDisplayDefineConnector'));

    expect(screen.getByTestId('uptimeSettingsDefineConnector')).toBeInTheDocument();
  });
});
