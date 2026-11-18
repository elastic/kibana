/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ListParamItem } from './params_list';
import type { ParamFormData } from './add_param_form';
import { VALUE_REQUIRED } from './add_param_form';
import { ParamValueField } from './param_value_field';

const mockGet = jest.fn();
const mockServices = { http: { get: mockGet } };

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockServices }),
}));

const Harness = ({
  isEditingItem,
  sourceType = 'value',
  defaultValues = { value: '' },
}: {
  isEditingItem: ListParamItem | null;
  sourceType?: 'value' | 'vault';
  defaultValues?: Partial<ParamFormData>;
}) => {
  const form = useForm<ParamFormData>({ mode: 'onSubmit', defaultValues });
  return (
    <I18nProvider>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => {})}>
          <ParamValueField isEditingItem={isEditingItem} sourceType={sourceType} />
          <button type="submit">save</button>
        </form>
      </FormProvider>
    </I18nProvider>
  );
};

describe('ParamValueField', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue([]);
  });

  it('requires a value when a Vault-backed param is switched to a literal', async () => {
    render(
      <Harness isEditingItem={{ id: 'p1', key: 'apiKey', value: 'vault://prod@app/api#key' }} />
    );

    await userEvent.click(screen.getByText('save'));

    await waitFor(() => expect(screen.getByText(VALUE_REQUIRED)).toBeInTheDocument());
  });

  it('lets a literal param keep its stored value when left blank', async () => {
    render(<Harness isEditingItem={{ id: 'p1', key: 'apiKey', value: 'secret' }} />);

    await userEvent.click(screen.getByText('save'));

    expect(screen.queryByText(VALUE_REQUIRED)).not.toBeInTheDocument();
  });

  describe('Vault source', () => {
    const vaultDefaults = {
      value: '',
      source: { connection: 'prod', path: 'app/creds', field: 'password' },
    } as Partial<ParamFormData>;

    it('rejects a field that would add literal text to the reference', async () => {
      mockGet.mockResolvedValue([{ name: 'prod' }]);
      render(
        <Harness
          isEditingItem={null}
          sourceType="vault"
          defaultValues={{
            ...vaultDefaults,
            source: { connection: 'prod', path: 'app/creds', field: 'password extra' },
          }}
        />
      );

      await userEvent.click(screen.getByText('save'));

      await waitFor(() =>
        expect(screen.getByText(/Use only letters, numbers, ".", "_" and "-"/)).toBeInTheDocument()
      );
    });

    it('shows the stored connection while the list is empty', async () => {
      render(<Harness isEditingItem={null} sourceType="vault" defaultValues={vaultDefaults} />);

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      expect(screen.getByTestId('syntheticsParamSecretConnection')).toHaveValue('prod');
    });

    it('shows an error with a retry when the connections fail to load', async () => {
      mockGet.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([{ name: 'prod' }]);
      render(<Harness isEditingItem={null} sourceType="vault" defaultValues={vaultDefaults} />);

      await waitFor(() =>
        expect(screen.getByText(/Could not load the Vault connections/)).toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId('syntheticsParamSecretConnectionRetry'));

      await waitFor(() =>
        expect(screen.queryByText(/Could not load the Vault connections/)).not.toBeInTheDocument()
      );
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});
