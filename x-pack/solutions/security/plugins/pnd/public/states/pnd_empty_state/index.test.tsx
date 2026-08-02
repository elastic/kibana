/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PndEmptyState } from '.';

const defaultProps = {
  title: 'No proposals',
};

describe('PndEmptyState', () => {
  it('renders the empty state', () => {
    render(<PndEmptyState {...defaultProps} />);

    expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<PndEmptyState {...defaultProps} />);

    expect(screen.getByText('No proposals')).toBeInTheDocument();
  });

  it('renders the body when one is supplied', () => {
    render(<PndEmptyState {...defaultProps} body="Nothing is waiting on you" />);

    expect(screen.getByText('Nothing is waiting on you')).toBeInTheDocument();
  });

  /**
   * EUI 119 dropped visualization glyphs such as `visTagCloud`. Passing a removed
   * name makes EuiIcon paint the broken-image placeholder.
   */
  it('defaults to a shipped EUI icon', () => {
    render(<PndEmptyState {...defaultProps} />);

    expect(document.querySelector('[data-euiicon-type="checkCircle"]')).toBeInTheDocument();
  });
});
