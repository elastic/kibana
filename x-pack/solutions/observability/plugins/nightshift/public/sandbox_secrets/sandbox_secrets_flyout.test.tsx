/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../hooks/use_kibana';
import { SandboxSecretsFlyout } from './sandbox_secrets_flyout';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const setup = (getResponse: { keys: string[]; version?: string; canEncrypt: boolean }) => {
  const fetch = jest.fn(async (endpoint: string, _options?: { params?: { body: unknown } }) => {
    if (endpoint.startsWith('GET ')) return getResponse;
    return { keys: [], version: 'next' };
  });
  const notifications = {
    toasts: { addSuccess: jest.fn(), addError: jest.fn(), addWarning: jest.fn() },
  };
  mockUseKibana.mockReturnValue({
    services: { notifications, nightshiftInvestigations: { investigationsClient: { fetch } } },
  });
  const onClose = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SandboxSecretsFlyout onClose={onClose} />
      </QueryClientProvider>
    </I18nProvider>
  );
  const getPutBody = () => fetch.mock.calls.find(([endpoint]) => endpoint.startsWith('PUT '))?.[1];
  return { fetch, onClose, getPutBody };
};

const getRows = () => screen.getAllByTestId('nightshiftSandboxSecretRow');

describe('SandboxSecretsFlyout', () => {
  it('lists stored keys without ever showing their values', async () => {
    setup({ keys: ['GITHUB_TOKEN'], version: 'v1', canEncrypt: true });

    const keyInput = await screen.findByTestId('nightshiftSandboxSecretKey');
    expect(keyInput).toHaveValue('GITHUB_TOKEN');
    const valueInput = screen.getByTestId('nightshiftSandboxSecretValue');
    expect(valueInput).toHaveValue('');
    expect(valueInput).toHaveAttribute(
      'placeholder',
      'Stored value hidden. Enter a new value to replace it.'
    );
  });

  it('omits blank values for stored keys so they are kept, and sends new values', async () => {
    const { getPutBody, onClose } = setup({
      keys: ['GITHUB_TOKEN'],
      version: 'v1',
      canEncrypt: true,
    });
    await screen.findByTestId('nightshiftSandboxSecretKey');

    fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsAdd'));
    const [, newRow] = getRows();
    fireEvent.change(within(newRow).getByTestId('nightshiftSandboxSecretKey'), {
      target: { value: 'NEW_KEY' },
    });
    fireEvent.change(within(newRow).getByTestId('nightshiftSandboxSecretValue'), {
      target: { value: 'new-secret' },
    });

    await act(async () => fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsSave')));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getPutBody()?.params?.body).toEqual({
      entries: [{ key: 'GITHUB_TOKEN' }, { key: 'NEW_KEY', value: 'new-secret' }],
      version: 'v1',
    });
  });

  it('requires a value for new rows and renamed keys', async () => {
    const { getPutBody } = setup({ keys: ['OLD_NAME'], version: 'v1', canEncrypt: true });
    const keyInput = await screen.findByTestId('nightshiftSandboxSecretKey');

    fireEvent.change(keyInput, { target: { value: 'RENAMED' } });
    await act(async () => fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsSave')));

    expect(screen.getByText('Enter a value for this secret.')).toBeInTheDocument();
    expect(getPutBody()).toBeUndefined();
  });

  it('rejects reserved keys', async () => {
    const { getPutBody } = setup({ keys: [], canEncrypt: true });
    await screen.findByTestId('nightshiftSandboxSecretsEmpty');

    fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsAdd'));
    fireEvent.change(screen.getByTestId('nightshiftSandboxSecretKey'), {
      target: { value: 'CONNECTOR_TOKEN' },
    });
    fireEvent.change(screen.getByTestId('nightshiftSandboxSecretValue'), {
      target: { value: 'reserved-value' },
    });
    await act(async () => fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsSave')));

    expect(screen.getByText(/CONNECTOR_\* are reserved/)).toBeInTheDocument();
    expect(getPutBody()).toBeUndefined();
  });

  it('rejects values too short to be redacted from sandbox output', async () => {
    const { getPutBody } = setup({ keys: [], canEncrypt: true });
    await screen.findByTestId('nightshiftSandboxSecretsEmpty');

    fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsAdd'));
    fireEvent.change(screen.getByTestId('nightshiftSandboxSecretKey'), {
      target: { value: 'SHORT_VALUE' },
    });
    fireEvent.change(screen.getByTestId('nightshiftSandboxSecretValue'), {
      target: { value: 'short' },
    });
    await act(async () => fireEvent.click(screen.getByTestId('nightshiftSandboxSecretsSave')));

    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(getPutBody()).toBeUndefined();
  });

  it('disables editing when encryption is unavailable', async () => {
    setup({ keys: ['GITHUB_TOKEN'], version: 'v1', canEncrypt: false });

    expect(await screen.findByTestId('nightshiftSandboxSecretsCannotEncrypt')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftSandboxSecretKey')).toBeDisabled();
    expect(screen.getByTestId('nightshiftSandboxSecretsAdd')).toBeDisabled();
    expect(screen.getByTestId('nightshiftSandboxSecretsSave')).toBeDisabled();
  });
});
