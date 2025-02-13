/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { SettingsModal } from '.';
import { MAX_ALERTS } from './alerts_settings';

const defaultProps = {
  connectorId: undefined,
  isLoading: false,
  localStorageAttackDiscoveryMaxAlerts: undefined,
  setLocalStorageAttackDiscoveryMaxAlerts: jest.fn(),
};

describe('SettingsModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the modal when the settings button is clicked', () => {
    render(<SettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('settings'));

    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('closes the modal when the close button is clicked', () => {
    render(<SettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('settings'));
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel'));
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    render(<SettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('settings'));
    fireEvent.click(screen.getByText(`${MAX_ALERTS}`));

    fireEvent.click(screen.getByTestId('save'));

    expect(defaultProps.setLocalStorageAttackDiscoveryMaxAlerts).toHaveBeenCalledWith(
      `${MAX_ALERTS}`
    );
  });

  it('resets max alerts to the default when the reset button is clicked', async () => {
    render(<SettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('settings'));

    fireEvent.click(screen.getByText(`${MAX_ALERTS}`));
    await waitFor(() => expect(screen.getByTestId('alertsRange')).toHaveValue(`${MAX_ALERTS}`));

    fireEvent.click(screen.getByTestId('reset'));

    await waitFor(() =>
      expect(screen.getByTestId('alertsRange')).toHaveValue(
        `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`
      )
    );
  });
});
