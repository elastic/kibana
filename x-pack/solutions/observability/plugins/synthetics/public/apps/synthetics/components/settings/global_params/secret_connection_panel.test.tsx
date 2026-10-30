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
  notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn(), addWarning: jest.fn() } },
  application: { capabilities: { uptime: { canManageSecretConnections: true } } },
};

const mockGetAffected = jest.fn();
const mockPreview = jest.fn();
jest.mock('../../../state/settings/api', () => ({
  getAffectedMonitors: (...args: unknown[]) => mockGetAffected(...args),
  previewAffectedMonitors: (...args: unknown[]) => mockPreview(...args),
  testSecretConnection: jest.fn(),
}));

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
    mockGetAffected.mockResolvedValue({});
    mockPreview.mockResolvedValue({ monitors: [], total: 0 });
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

  describe('monitors affected by the allowed hosts', () => {
    it('shows which monitors would report down while the hosts are edited', async () => {
      mockPreview.mockResolvedValue({
        monitors: [
          { name: 'checkout', reason: 'host' },
          { name: 'login', reason: 'monitor_type' },
        ],
        total: 3,
      });
      await openEditFlyout();

      await userEvent.type(hostsInput(), 'api.example.com{enter}');

      const callout = await screen.findByTestId('syntheticsVaultAffectedMonitorsCallout');
      expect(callout).toHaveTextContent('3 monitors will report down');
      expect(callout).toHaveTextContent('checkout (other host)');
      expect(callout).toHaveTextContent('login (browser monitor)');
      expect(callout).toHaveTextContent('and 1 more');
      expect(mockPreview).toHaveBeenLastCalledWith({
        name: 'prod',
        allowedMonitorHosts: ['api.example.com'],
      });
    });

    it('includes a host that was typed but not confirmed with Enter', async () => {
      mockPreview.mockResolvedValue({ monitors: [{ name: 'checkout', reason: 'host' }], total: 1 });
      await openEditFlyout();

      await userEvent.type(hostsInput(), 'API.example.com');

      const callout = await screen.findByTestId('syntheticsVaultAffectedMonitorsCallout');
      expect(callout).toHaveTextContent('checkout (other host)');
      expect(mockPreview).toHaveBeenLastCalledWith({
        name: 'prod',
        allowedMonitorHosts: ['api.example.com'],
      });
    });

    it('adds the typed host to the confirmed ones, once', async () => {
      await openEditFlyout();
      await userEvent.type(hostsInput(), 'a.example.com{enter}');
      await waitFor(() => expect(mockPreview).toHaveBeenCalled());

      await userEvent.type(hostsInput(), 'b.example.com');
      await waitFor(() =>
        expect(mockPreview).toHaveBeenLastCalledWith({
          name: 'prod',
          allowedMonitorHosts: ['a.example.com', 'b.example.com'],
        })
      );
    });

    it('does not ask for text that is not a host yet', async () => {
      await openEditFlyout();

      await userEvent.type(hostsInput(), 'https://api');
      await userEvent.clear(hostsInput());
      await userEvent.type(hostsInput(), '2001:db8:');

      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(mockPreview).not.toHaveBeenCalled();
    });

    it('says when no existing monitor is affected', async () => {
      await openEditFlyout();

      await userEvent.type(hostsInput(), 'api.example.com{enter}');

      expect(await screen.findByTestId('syntheticsVaultAffectedMonitorsNone')).toBeInTheDocument();
      expect(
        screen.queryByTestId('syntheticsVaultAffectedMonitorsCallout')
      ).not.toBeInTheDocument();
    });

    it('says when it could not check', async () => {
      mockPreview.mockRejectedValue(new Error('boom'));
      await openEditFlyout();

      await userEvent.type(hostsInput(), 'api.example.com{enter}');

      expect(
        await screen.findByTestId('syntheticsVaultAffectedMonitorsFailed')
      ).toBeInTheDocument();
    });

    it('does not ask while there are no hosts', async () => {
      await openEditFlyout();

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      expect(mockPreview).not.toHaveBeenCalled();
      expect(screen.queryByTestId('syntheticsVaultAffectedMonitorsNone')).not.toBeInTheDocument();
    });

    it('shows the current state in the connection table', async () => {
      mockGet.mockResolvedValue([
        {
          ...savedConnection,
          config: {
            ...savedConnection.config,
            allowedMonitorHosts: ['api.example.com', 'b.example.com'],
          },
        },
        { ...savedConnection, name: 'staging' },
      ]);
      mockGetAffected.mockResolvedValue({
        prod: { monitors: [{ name: 'checkout', reason: 'host' }], total: 1 },
      });
      render(
        <I18nProvider>
          <SecretConnectionPanel />
        </I18nProvider>
      );

      expect(await screen.findByTestId('syntheticsVaultHostsBadge')).toHaveTextContent('2 hosts');
      expect(await screen.findByTestId('syntheticsVaultAffectedMonitorsBadge')).toHaveTextContent(
        '1 monitor down'
      );
      expect(screen.getByTestId('syntheticsVaultAnyHost')).toHaveTextContent('Any host');
    });
  });
});
