/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyPage } from '.';

describe('EmptyPage', () => {
  it('renders the empty monitoring state', () => {
    render(<EmptyPage />);

    expect(screen.getByTestId('monitoringEmptyPage')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<EmptyPage />);

    expect(screen.getByText('No action-triggered runs')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<EmptyPage />);

    expect(
      screen.getByText(
        'Action-triggered runs are generated when detection rules trigger the Attack Discovery action. Configure a detection rule action to see results here.'
      )
    ).toBeInTheDocument();
  });
});
