/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ParamFormData, ParamValueSourceType } from './add_param_form';
import { AddParamForm } from './add_param_form';
import { kibanaService } from '../../../../../utils/kibana_service';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: { get: jest.fn().mockResolvedValue([]) } } }),
}));

const Harness = ({ sourceType }: { sourceType: ParamValueSourceType }) => {
  const form = useForm<ParamFormData>({ defaultValues: { value: '', sourceType } });
  return (
    <I18nProvider>
      <FormProvider {...form}>
        <AddParamForm items={[]} isEditingItem={null} />
      </FormProvider>
    </I18nProvider>
  );
};

describe('AddParamForm', () => {
  afterEach(() => {
    kibanaService.secretConnectionsEnabled = true;
  });

  it('offers the Vault source when secret connections are enabled', () => {
    render(<Harness sourceType="value" />);
    expect(screen.getByTestId('syntheticsParamSourceVault')).toBeInTheDocument();
  });

  it('hides the Vault source when secret connections are disabled', () => {
    kibanaService.secretConnectionsEnabled = false;
    render(<Harness sourceType="value" />);
    expect(screen.queryByTestId('syntheticsParamSourceVault')).not.toBeInTheDocument();
  });

  it('keeps the source choice for an existing Vault param when disabled', () => {
    kibanaService.secretConnectionsEnabled = false;
    render(<Harness sourceType="vault" />);
    expect(screen.getByTestId('syntheticsParamSourceLiteral')).toBeInTheDocument();
  });
});
