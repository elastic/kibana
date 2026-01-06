/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen, within } from '@testing-library/react';

import '@testing-library/jest-dom';
import { Loading, LoadingOverlay } from '.';

describe('Loading', () => {
  let loading: HTMLElement;

  beforeEach(() => {
    render(<Loading />);
    loading = screen.getByTestId('enterpriseSearchLoading');
  });
  it('renders Loading', () => {
    expect(loading).toBeInTheDocument();
  });

  it('renders loading logo', () => {
    const logo = within(loading).getByTestId('euiLoadingLogo');
    expect(logo).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  let loadingOverlay: HTMLElement;

  beforeEach(() => {
    render(<LoadingOverlay />);
    loadingOverlay = screen.getByTestId('enterpriseSearchLoadingOverlay');
  });

  it('renders Loading', () => {
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('renders loading spinner', () => {
    const spinner = within(loadingOverlay).getByTestId('euiLoadingSpinner');
    expect(spinner).toBeInTheDocument();
  });
});
