/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen } from '@testing-library/react';
import { NeedHelp } from './need_help';
import { renderWithTestProvider } from '../../test/test_provider';

describe('NeedHelp Component', () => {
  it('renders the component with correct title and link', () => {
    renderWithTestProvider(<NeedHelp />);

    expect(screen.getByText(/need help?/i)).toBeInTheDocument();

    expect(screen.getByText(/read documentation/i).closest('a')).toHaveAttribute(
      'href',
      'https://ela.st/cloud-asset-discovery'
    );
  });
});
