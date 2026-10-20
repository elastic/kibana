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

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: { get: jest.fn().mockResolvedValue([]) } } }),
}));

const Harness = ({ isEditingItem }: { isEditingItem: ListParamItem | null }) => {
  const form = useForm<ParamFormData>({ mode: 'onSubmit', defaultValues: { value: '' } });
  return (
    <I18nProvider>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => {})}>
          <ParamValueField isEditingItem={isEditingItem} sourceType="value" />
          <button type="submit">save</button>
        </form>
      </FormProvider>
    </I18nProvider>
  );
};

describe('ParamValueField', () => {
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
});
