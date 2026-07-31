/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { VendorEndpointCard } from './vendor_endpoint_card';

jest.mock('../shared/logo_icon', () => ({
  LogoIcon: ({ logo, color }: { logo?: string; color?: string }) => (
    <div data-test-subj={`logoIconStub-${logo}`} data-color={color} />
  ),
}));

const vendor = {
  id: ApiEndpointId.Supabase,
  cardTitle: 'Supabase',
  fieldLabel: 'Supabase logs endpoint',
  logo: 'supabase' as const,
  url: 'https://otlp.example.com:443/supabase/v1/logs',
};

const defaultProps = {
  vendor,
  isCreating: false,
  canCreate: true,
  wasKeyCreatedBefore: false,
  isLoading: false,
  onCreateApiKey: jest.fn(),
};

const renderCard = (props: Partial<React.ComponentProps<typeof VendorEndpointCard>> = {}) =>
  render(
    <I18nProvider>
      <VendorEndpointCard {...defaultProps} {...props} />
    </I18nProvider>
  );

describe('VendorEndpointCard', () => {
  it('renders the vendor title, logo, and endpoint URL', () => {
    renderCard();

    expect(screen.getByText('Supabase')).toBeInTheDocument();
    expect(screen.getByTestId('logoIconStub-supabase')).toHaveAttribute('data-color', '#FFFFFF');
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointValue-supabase-popover')
    ).toHaveValue('https://otlp.example.com:443/supabase/v1/logs');
  });

  it('disables the create button when another creation is in flight', () => {
    renderCard({ isDisabled: true });

    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointCreateApiKeyButton-supabase-popover')
    ).toBeDisabled();
  });

  it('starts with the no-key placeholder and creates a key on click', () => {
    const onCreateApiKey = jest.fn();
    renderCard({ onCreateApiKey });

    expect(screen.getByPlaceholderText('No API key yet')).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId('observabilityOnboardingApiEndpointCreateApiKeyButton-supabase-popover')
    );

    expect(onCreateApiKey).toHaveBeenCalledTimes(1);
  });

  it('shows a created key with a vendor-specific aria label', () => {
    renderCard({ encodedApiKey: 'encoded-key' });

    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointApiKeyValue-supabase-popover')
    ).toHaveAttribute('aria-label', 'Supabase API key');
    expect(screen.getByDisplayValue('encoded-key')).toBeInTheDocument();
  });
});
