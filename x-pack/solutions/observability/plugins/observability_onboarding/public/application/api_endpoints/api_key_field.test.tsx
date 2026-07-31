/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ApiKeyField } from './api_key_field';

describe('ApiKeyField', () => {
  const defaultProps = {
    isCreating: false,
    canCreate: true,
    wasKeyCreatedBefore: false,
    onCreate: jest.fn(),
  };

  it('shows the default placeholder when no key was ever created', () => {
    render(<ApiKeyField {...defaultProps} />);

    expect(screen.getByPlaceholderText('No API key yet')).toBeInTheDocument();
  });

  it('shows the created-before placeholder when a key was created previously', () => {
    render(<ApiKeyField {...defaultProps} wasKeyCreatedBefore={true} />);

    expect(
      screen.getByPlaceholderText('Existing key cannot be displayed. Create a new one')
    ).toBeInTheDocument();
  });

  it('supports a compact created-before placeholder', () => {
    render(
      <ApiKeyField
        {...defaultProps}
        wasKeyCreatedBefore={true}
        createdBeforePlaceholder="Cannot display existing keys"
      />
    );

    expect(screen.getByPlaceholderText('Cannot display existing keys')).toBeInTheDocument();
  });

  it('shows the key value when a key is present in memory', () => {
    render(
      <ApiKeyField {...defaultProps} wasKeyCreatedBefore={true} encodedApiKey="encoded-key" />
    );

    expect(screen.getByDisplayValue('encoded-key')).toBeInTheDocument();
  });

  it('hides the show/hide toggle when there is no key to reveal', () => {
    render(<ApiKeyField {...defaultProps} wasKeyCreatedBefore={true} />);

    expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument();
  });

  it('shows the show/hide toggle when a key is present in memory', () => {
    render(
      <ApiKeyField {...defaultProps} wasKeyCreatedBefore={true} encodedApiKey="encoded-key" />
    );

    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('renders default test subjects without a suffix', () => {
    render(<ApiKeyField {...defaultProps} />);

    expect(screen.getByTestId('observabilityOnboardingApiEndpointApiKeyValue')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointCreateApiKeyButton')
    ).toBeInTheDocument();
  });

  it('suffixes test subjects and applies a custom aria label', () => {
    render(
      <ApiKeyField
        {...defaultProps}
        dataTestSubjSuffix="-supabase"
        ariaLabel="Supabase API key"
        encodedApiKey="encoded-key"
      />
    );

    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointApiKeyValue-supabase')
    ).toHaveAttribute('aria-label', 'Supabase API key');
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointApiKeyCopyButton-supabase')
    ).toHaveAttribute('aria-label', 'Copy Supabase API key to clipboard');
    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointCreateApiKeyButton-supabase')
    ).toBeInTheDocument();
  });

  it('names the copy button after the default label when no aria label is given', () => {
    render(<ApiKeyField {...defaultProps} encodedApiKey="encoded-key" />);

    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointApiKeyCopyButton')
    ).toHaveAttribute('aria-label', 'Copy API key to clipboard');
  });

  it('disables only the create button when isDisabled is set', () => {
    render(<ApiKeyField {...defaultProps} isDisabled={true} />);

    expect(
      screen.getByTestId('observabilityOnboardingApiEndpointCreateApiKeyButton')
    ).toBeDisabled();
    expect(screen.queryByText(/don't have permission/)).not.toBeInTheDocument();
  });
});
