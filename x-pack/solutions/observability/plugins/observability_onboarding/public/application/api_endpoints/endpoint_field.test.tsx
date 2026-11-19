/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EndpointField } from './endpoint_field';

const renderField = (props: Partial<React.ComponentProps<typeof EndpointField>> = {}) =>
  render(
    <I18nProvider>
      <EndpointField isLoading={false} {...props} />
    </I18nProvider>
  );

describe('EndpointField', () => {
  it('renders the default label and test subjects', () => {
    renderField({ url: 'https://otlp.example.com' });

    expect(screen.getByLabelText('Endpoint')).toHaveValue('https://otlp.example.com');
    expect(screen.getByTestId('observabilityOnboardingApiEndpointValue')).toBeInTheDocument();
    expect(screen.getByTestId('observabilityOnboardingApiEndpointCopyButton')).toHaveAttribute(
      'aria-label',
      'Copy Endpoint to clipboard'
    );
  });

  it('renders a custom label and suffixed test subjects', () => {
    renderField({
      url: 'https://otlp.example.com/inputs/vercel/_default_',
      label: 'Vercel endpoint',
      dataTestSubjSuffix: '-vercel',
    });

    expect(screen.getByText('Vercel endpoint')).toBeInTheDocument();
    expect(screen.getByLabelText('Vercel endpoint')).toHaveValue(
      'https://otlp.example.com/inputs/vercel/_default_'
    );
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointValue-vercel')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointCopyButton-vercel')
    ).toHaveAttribute('aria-label', 'Copy Vercel endpoint to clipboard');
  });

  it('disables the copy button when there is no URL', () => {
    renderField({});

    expect(screen.getByTestId('observabilityOnboardingApiEndpointCopyButton')).toBeDisabled();
  });
});
