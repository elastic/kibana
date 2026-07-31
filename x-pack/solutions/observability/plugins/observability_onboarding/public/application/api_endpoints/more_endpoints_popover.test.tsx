/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { waitForEuiPopoverClose, waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { MoreEndpointsPopover } from './more_endpoints_popover';

jest.mock('../shared/logo_icon', () => ({
  LogoIcon: ({ logo }: { logo?: string }) => <div data-test-subj={`logoIconStub-${logo}`} />,
}));

const vendors = [
  {
    id: ApiEndpointId.Supabase,
    cardTitle: 'Supabase',
    fieldLabel: 'Supabase logs endpoint',
    logo: 'supabase' as const,
    url: 'https://otlp.example.com:443/supabase/v1/logs',
  },
  {
    id: ApiEndpointId.Vercel,
    cardTitle: 'Vercel',
    fieldLabel: 'Vercel endpoint',
    logo: 'vercel_black' as const,
    url: 'https://otlp.example.com:443/vercel',
  },
];

const defaultProps = {
  vendors,
  encodedApiKeys: {},
  keyCreatedBeforeByEndpointId: {},
  creatingEndpointId: undefined,
  canCreateApiKey: true,
  isLoading: false,
  onCreateApiKey: jest.fn(),
};

const renderPopover = (props: Partial<React.ComponentProps<typeof MoreEndpointsPopover>> = {}) =>
  render(
    <I18nProvider>
      <MoreEndpointsPopover {...defaultProps} {...props} />
    </I18nProvider>
  );

const openPopover = async () => {
  fireEvent.click(screen.getByTestId('observabilityOnboardingMoreEndpointsButton'));
  await waitForEuiPopoverOpen();
};

const waitForPopoverContentUnmount = async () => {
  await waitForEuiPopoverClose();
  await waitFor(() => {
    expect(
      screen.queryByTestId('observabilityOnboardingVendorEndpointCard-supabase')
    ).not.toBeInTheDocument();
  });
};

describe('MoreEndpointsPopover', () => {
  it('renders nothing when no vendors resolve', () => {
    const { container } = renderPopover({ vendors: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it('opens a titled popover with one card per vendor', async () => {
    renderPopover();
    await openPopover();

    expect(screen.getByText('Other endpoints')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingVendorEndpointCard-supabase')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingVendorEndpointCard-vercel')
    ).toBeInTheDocument();
  });

  it('creates a key for the vendor whose button was clicked', async () => {
    const onCreateApiKey = jest.fn();
    renderPopover({ onCreateApiKey });
    await openPopover();

    fireEvent.click(
      screen.getByTestId('observabilityOnboardingApiEndpointCreateApiKeyButton-vercel-popover')
    );

    expect(onCreateApiKey).toHaveBeenCalledWith(ApiEndpointId.Vercel);
  });

  it('has an accessible dialog name', async () => {
    renderPopover();
    await openPopover();

    expect(screen.getByRole('dialog', { name: 'Other endpoints' })).toBeInTheDocument();
  });

  it('closes on Escape while a vendor key is being created', async () => {
    renderPopover({ creatingEndpointId: ApiEndpointId.Supabase });
    await openPopover();

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Other endpoints' }), { key: 'Escape' });
    await waitForPopoverContentUnmount();
  });

  it('closes on a trigger click while a vendor key is being created', async () => {
    renderPopover({ creatingEndpointId: ApiEndpointId.Supabase });
    await openPopover();

    fireEvent.click(screen.getByTestId('observabilityOnboardingMoreEndpointsButton'));
    await waitForPopoverContentUnmount();
  });

  it('re-shows a previously created key after close and reopen', async () => {
    renderPopover({ encodedApiKeys: { [ApiEndpointId.Supabase]: 'encoded-key' } });
    await openPopover();

    expect(screen.getByDisplayValue('encoded-key')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('observabilityOnboardingMoreEndpointsButton'));
    await waitForPopoverContentUnmount();
    fireEvent.click(screen.getByTestId('observabilityOnboardingMoreEndpointsButton'));
    await waitForEuiPopoverOpen();

    expect(screen.getByDisplayValue('encoded-key')).toBeInTheDocument();
  });

  it('closes on Escape when idle', async () => {
    renderPopover();
    await openPopover();

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Other endpoints' }), { key: 'Escape' });
    await waitForPopoverContentUnmount();
  });
});
