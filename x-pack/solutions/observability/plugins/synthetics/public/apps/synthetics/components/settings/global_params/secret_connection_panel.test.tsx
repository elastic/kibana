/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { SecretConnectionPanel } from './secret_connection_panel';

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockServices = {
  http: { get: mockGet, put: mockPut },
  notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
  application: { capabilities: { uptime: { canManageSecretConnections: true } } },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockServices }),
}));

const savedConnection = {
  configured: true,
  name: 'prod',
  type: 'hashicorp_vault',
  hasSecret: true,
  config: { address: 'https://vault.example.com:8200', authMethod: 'token' },
};

const hostsField = () => screen.getByTestId('syntheticsVaultAllowedMonitorHosts');
const hostsInput = () => within(hostsField()).getByRole('combobox');
const INVALID_HOST_ERROR = /Enter a host name or IP address without a scheme/;

const openEditFlyout = async () => {
  render(
    <I18nProvider>
      <SecretConnectionPanel />
    </I18nProvider>
  );
  await userEvent.click(await screen.findByTestId('syntheticsVaultEditConnection'));
  await screen.findByTestId('syntheticsSecretConnectionFlyout');
};

describe('SecretConnectionPanel allowed monitor hosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue([savedConnection]);
    mockPut.mockResolvedValue({});
  });

  it('does not save while the host being entered is invalid, and keeps it visible', async () => {
    await openEditFlyout();

    await userEvent.type(hostsInput(), 'https://api.example.com{enter}');

    expect(await screen.findByText(INVALID_HOST_ERROR)).toBeInTheDocument();
    expect(hostsInput()).toHaveValue('https://api.example.com');

    await userEvent.click(screen.getByTestId('syntheticsVaultSaveConnection'));

    expect(mockPut).not.toHaveBeenCalled();
    expect(screen.getByText(INVALID_HOST_ERROR)).toBeInTheDocument();
  });

  it('saves a valid host that was typed but not confirmed with Enter', async () => {
    await openEditFlyout();

    await userEvent.type(hostsInput(), 'API.Example.com');
    await userEvent.click(screen.getByTestId('syntheticsVaultSaveConnection'));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockPut.mock.calls[0][1].body);
    expect(body.config.allowedMonitorHosts).toEqual(['api.example.com']);
  });

  it('does not carry a host error over to the next flyout', async () => {
    await openEditFlyout();
    await userEvent.type(hostsInput(), 'https://api.example.com{enter}');
    expect(await screen.findByText(INVALID_HOST_ERROR)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByTestId('syntheticsVaultAddConnection'));
    await screen.findByTestId('syntheticsSecretConnectionFlyout');

    expect(screen.queryByText(INVALID_HOST_ERROR)).not.toBeInTheDocument();
    expect(hostsInput()).toHaveValue('');
  });

  it('closes the flyout without a leftover error after a successful save', async () => {
    await openEditFlyout();
    await userEvent.click(screen.getByTestId('syntheticsVaultSaveConnection'));
    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByTestId('syntheticsSecretConnectionFlyout')).not.toBeInTheDocument()
    );

    await userEvent.click(screen.getByTestId('syntheticsVaultAddConnection'));
    await screen.findByTestId('syntheticsSecretConnectionFlyout');

    expect(screen.queryByText(INVALID_HOST_ERROR)).not.toBeInTheDocument();
  });
});
