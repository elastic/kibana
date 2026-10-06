/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { buildServiceAccountUrl } from '@kbn/alertzero-common';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  CreateServiceAccountProps,
  ServiceAccountPickerProps,
} from '@kbn/security-plugin/public';
import { ServiceAccountField } from './service_account_field';

const WORKER_ID = 'system-security-floor-alert-triage';
const WORKER_NAME = 'Alert Triage';

const pickerAccount = {
  id: 'account-a',
  name: 'Reader',
  roles: ['reader'],
  enabled: true,
  assumable: true,
};
const createdAccount = {
  id: 'account-new',
  name: 'New account',
  roles: ['reader'],
};

const selectButton = () => screen.getByTestId(`alertZeroServiceAccountSelect-${WORKER_ID}`);

const renderField = ({
  withUi = true,
  accountLookup,
  ...props
}: Partial<React.ComponentProps<typeof ServiceAccountField>> & {
  withUi?: boolean;
  accountLookup?: { id: string; name: string } | 'reject';
} = {}) => {
  const onChange = jest.fn();
  const core = coreMock.createStart();
  if (accountLookup === 'reject') {
    core.http.get.mockRejectedValue(new Error('forbidden'));
  } else {
    core.http.get.mockResolvedValue(accountLookup);
  }
  const getServiceAccountPicker = jest.fn(
    ({ onSelect, onCreate, onClose }: ServiceAccountPickerProps) => (
      <>
        <button type="button" onClick={() => onSelect(pickerAccount)}>
          {pickerAccount.name}
        </button>
        <button type="button" onClick={() => onSelect(null)}>
          Clear account
        </button>
        <button type="button" onClick={() => onCreate?.()}>
          Create account
        </button>
        <button type="button" onClick={() => onClose?.()}>
          Close picker
        </button>
      </>
    )
  );
  const getCreateServiceAccount = jest.fn(({ onCreated, onClose }: CreateServiceAccountProps) => (
    <>
      <button type="button" onClick={() => onCreated(createdAccount)}>
        Save account
      </button>
      <button type="button" onClick={onClose}>
        Cancel create
      </button>
    </>
  ));
  const services = {
    ...core,
    security: {
      ...core.security,
      uiApi: withUi
        ? { components: { getServiceAccountPicker, getCreateServiceAccount } }
        : undefined,
    },
  };

  const view = render(
    <KibanaContextProvider services={services}>
      <ServiceAccountField
        workerId={WORKER_ID}
        workerName={WORKER_NAME}
        onChange={onChange}
        {...props}
      />
    </KibanaContextProvider>
  );

  return { ...view, onChange, getServiceAccountPicker, services };
};

describe('ServiceAccountField', () => {
  const defaultProps = {
    workerId: WORKER_ID,
    workerName: WORKER_NAME,
    onChange: jest.fn(),
  };

  it('shows the placeholder when no account is selected', () => {
    renderField();

    expect(selectButton()).toHaveTextContent('Select a service account');
  });

  it('shows the stored id when the account name is not known yet', () => {
    renderField({ current: 'account-a' });

    expect(selectButton()).toHaveTextContent('account-a');
  });

  it('loads the account name for a stored id', async () => {
    const { services } = renderField({
      current: 'kibana/az-worker-1',
      accountLookup: { id: 'kibana/az-worker-1', name: 'az-worker-1' },
    });

    expect(await screen.findByText('az-worker-1')).toBeInTheDocument();
    expect(services.http.get).toHaveBeenCalledWith(buildServiceAccountUrl('kibana/az-worker-1'));
  });

  it('shows the stored id when the name lookup fails', async () => {
    const { services } = renderField({ current: 'kibana/az-worker-1', accountLookup: 'reject' });
    await act(async () => {
      const pending = services.http.get.mock.results[0]?.value;
      if (!pending) {
        throw new Error('expected a name lookup');
      }
      await pending.catch(() => undefined);
    });

    expect(screen.getByTestId(`alertZeroServiceAccountSelect-${WORKER_ID}`)).toHaveTextContent(
      'kibana/az-worker-1'
    );
  });

  it('labels the control with the worker name', () => {
    renderField();

    expect(selectButton()).toHaveAttribute('aria-label', 'Run as for Alert Triage');
  });

  it('uses the aria label override', () => {
    renderField({ ariaLabel: 'Run as' });

    expect(selectButton()).toHaveAttribute('aria-label', 'Run as');
  });

  it('keeps the picker closed until the control is opened', () => {
    renderField();

    expect(screen.queryByRole('button', { name: 'Reader' })).not.toBeInTheDocument();
  });

  it('opens the shared picker', () => {
    renderField();

    fireEvent.click(selectButton());

    expect(screen.getByRole('button', { name: 'Reader' })).toBeInTheDocument();
  });

  it('passes the current account to the picker', () => {
    const { getServiceAccountPicker } = renderField({ current: 'account-a' });

    fireEvent.click(selectButton());

    expect(getServiceAccountPicker).toHaveBeenCalledWith(
      expect.objectContaining({ selectedId: 'account-a' })
    );
  });

  it('does not offer the current user', () => {
    const { getServiceAccountPicker } = renderField();

    fireEvent.click(selectButton());

    expect(getServiceAccountPicker.mock.calls[0][0].allowCurrentUser).toBeUndefined();
  });

  it('reports the selected account id and name', () => {
    const { onChange } = renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Reader' }));

    expect(onChange).toHaveBeenCalledWith('account-a', 'Reader');
  });

  it('shows the selected account name once that id is current', () => {
    const { rerender, onChange, services } = renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Reader' }));
    rerender(
      <KibanaContextProvider services={services}>
        <ServiceAccountField {...defaultProps} onChange={onChange} current="account-a" />
      </KibanaContextProvider>
    );

    expect(selectButton()).toHaveTextContent('Reader');
  });

  it('closes the picker after a selection', () => {
    renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Reader' }));

    expect(screen.queryByRole('button', { name: 'Reader' })).not.toBeInTheDocument();
  });

  it('clears the account when the picker reports none', () => {
    const { onChange } = renderField({ current: 'account-a' });

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Clear account' }));

    expect(onChange).toHaveBeenCalledWith(null, undefined);
  });

  it('closes the picker from the picker close action', () => {
    renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }));

    expect(screen.queryByRole('button', { name: 'Reader' })).not.toBeInTheDocument();
  });

  it('does not open the picker when the control is disabled', () => {
    const { getServiceAccountPicker } = renderField({ isDisabled: true });

    fireEvent.click(selectButton());

    expect(getServiceAccountPicker).not.toHaveBeenCalled();
  });

  it('closes the picker when creating an account', () => {
    renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.queryByRole('button', { name: 'Reader' })).not.toBeInTheDocument();
  });

  it('opens the create flyout when creating an account', () => {
    renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('button', { name: 'Save account' })).toBeInTheDocument();
  });

  it('reports the created account id and name', () => {
    const { onChange } = renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));

    expect(onChange).toHaveBeenCalledWith('account-new', 'New account');
  });

  it('shows the created account name once that id is current', () => {
    const { rerender, onChange, services } = renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    rerender(
      <KibanaContextProvider services={services}>
        <ServiceAccountField {...defaultProps} onChange={onChange} current="account-new" />
      </KibanaContextProvider>
    );

    expect(selectButton()).toHaveTextContent('New account');
  });

  it('dismisses the create flyout without reporting an account', () => {
    const { onChange } = renderField();

    fireEvent.click(selectButton());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel create' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves the picker closed when security does not provide it', () => {
    renderField({ withUi: false });

    fireEvent.click(selectButton());

    expect(screen.queryByRole('button', { name: 'Reader' })).not.toBeInTheDocument();
  });
});
