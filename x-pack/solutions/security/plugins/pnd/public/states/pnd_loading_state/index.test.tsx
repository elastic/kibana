/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PndLoadingState } from '.';

describe('PndLoadingState', () => {
  it('renders a spinner', () => {
    render(<PndLoadingState />);

    expect(screen.getByTestId('pndLoadingState')).toBeInTheDocument();
  });

  it('labels the spinner so it is announced', () => {
    render(<PndLoadingState />);

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('accepts a caller-supplied label', () => {
    render(<PndLoadingState label="Loading proposals" />);

    expect(screen.getByLabelText('Loading proposals')).toBeInTheDocument();
  });
});
