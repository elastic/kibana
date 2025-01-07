/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';

import { AddInferenceFlyoutWrapper } from './add_inference_flyout_wrapper';
import { mockProviders } from '../../utils/test_utils/test_utils';

const mockAddEndpoint = jest.fn();
const onClose = jest.fn();
jest.mock('../../hooks/use_add_endpoint', () => ({
  useAddEndpoint: () => ({
    mutate: mockAddEndpoint.mockImplementation(() => Promise.resolve()),
  }),
}));

jest.mock('@kbn/inference-endpoint-ui-common/src/hooks/use_providers', () => ({
  useProviders: jest.fn(() => ({
    data: mockProviders,
  })),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();
  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

// Failing: See https://github.com/elastic/kibana/issues/205201
describe.skip('AddInferenceFlyout', () => {
  it('renders', () => {
    render(
      <MockFormProvider>
        <AddInferenceFlyoutWrapper onClose={onClose} />
      </MockFormProvider>
    );

    expect(screen.getByTestId('create-inference-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
    expect(screen.getByTestId('add-inference-endpoint-submit-button')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-close-button')).toBeInTheDocument();
  });

  it('invalidates form if no provider is selected', async () => {
    render(
      <MockFormProvider>
        <AddInferenceFlyoutWrapper onClose={onClose} />
      </MockFormProvider>
    );

    await userEvent.click(screen.getByTestId('add-inference-endpoint-submit-button'));
    expect(screen.getByText('Provider is required.')).toBeInTheDocument();
    expect(mockAddEndpoint).not.toHaveBeenCalled();
    expect(screen.getByTestId('add-inference-endpoint-submit-button')).toBeDisabled();
  });

  it('valid submission', async () => {
    render(
      <MockFormProvider>
        <AddInferenceFlyoutWrapper onClose={onClose} />
      </MockFormProvider>
    );

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Anthropic'));
    await userEvent.type(await screen.findByTestId('api_key-password'), 'test api passcode');
    await userEvent.type(
      await screen.findByTestId('model_id-input'),
      'sample model name from Anthropic'
    );

    await userEvent.click(screen.getByTestId('add-inference-endpoint-submit-button'));
    expect(mockAddEndpoint).toHaveBeenCalled();
  }, 10e3);
});
