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
});
