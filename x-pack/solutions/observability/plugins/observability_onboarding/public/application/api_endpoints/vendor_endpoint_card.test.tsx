/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { EuiThemeColorModeStandard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { VendorEndpointCard } from './vendor_endpoint_card';

jest.mock('../shared/logo_icon', () => ({
  LogoIcon: ({ logo }: { logo?: string }) => <div data-test-subj={`logoIconStub-${logo}`} />,
}));

const vercelVendor = {
  id: ApiEndpointId.Vercel,
  cardTitle: 'Vercel',
  fieldLabel: 'Vercel endpoint',
  logo: 'vercel_black' as const,
  darkLogo: 'vercel_white' as const,
  url: 'https://otlp.example.com:443/inputs/vercel/_default_',
};

const vendor = {
  id: ApiEndpointId.Supabase,
  cardTitle: 'Supabase',
  fieldLabel: 'Supabase logs endpoint',
  logo: 'supabase' as const,
  url: 'https://otlp.example.com:443/inputs/supabase/_default_/v1/logs',
};

const defaultProps = {
  vendor,
  isCreating: false,
  canCreate: true,
  wasKeyCreatedBefore: false,
  isLoading: false,
  onCreateApiKey: jest.fn(),
};

const renderCard = (
  props: Partial<React.ComponentProps<typeof VendorEndpointCard>> = {},
  colorMode: EuiThemeColorModeStandard = 'LIGHT'
) =>
  render(
    <I18nProvider>
      <EuiThemeProvider colorMode={colorMode}>
        <VendorEndpointCard {...defaultProps} {...props} />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('VendorEndpointCard', () => {
  it('renders the vendor title, logo, and endpoint URL', () => {
    renderCard();

    expect(screen.getByText('Supabase')).toBeInTheDocument();
    expect(screen.getByTestId('logoIconStub-supabase')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointValue-supabase-popover')
    ).toHaveValue('https://otlp.example.com:443/inputs/supabase/_default_/v1/logs');
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointValue-supabase-popover')
    ).toHaveAttribute('aria-label', 'Supabase logs endpoint');
  });

  it('uses the light logo variant in the light theme', () => {
    renderCard({ vendor: vercelVendor }, 'LIGHT');

    expect(screen.getByTestId('logoIconStub-vercel_black')).toBeInTheDocument();
  });

  it('uses the dark logo variant in the dark theme', () => {
    renderCard({ vendor: vercelVendor }, 'DARK');

    expect(screen.getByTestId('logoIconStub-vercel_white')).toBeInTheDocument();
  });

  it('keeps the single logo when a vendor has no dark variant', () => {
    renderCard({}, 'DARK');

    expect(screen.getByTestId('logoIconStub-supabase')).toBeInTheDocument();
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

  it('uses the compact placeholder for an existing key', () => {
    renderCard({ wasKeyCreatedBefore: true });

    expect(screen.getByPlaceholderText('Cannot display existing keys')).toBeInTheDocument();
  });

  it('shows a created key with a vendor-specific aria label', () => {
    renderCard({ encodedApiKey: 'encoded-key' });

    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointApiKeyValue-supabase-popover')
    ).toHaveAttribute('aria-label', 'Supabase API key');
    expect(screen.getByDisplayValue('encoded-key')).toBeInTheDocument();
  });
});
