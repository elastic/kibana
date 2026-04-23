/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from './priority_badge';

describe('PriorityBadge', () => {
  it('renders the correct priority number', () => {
    render(<PriorityBadge priority={7} />);
    const badge = screen.getByTestId('leadPriorityBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('7');
  });

  it('renders priority 1', () => {
    render(<PriorityBadge priority={1} />);
    expect(screen.getByTestId('leadPriorityBadge')).toHaveTextContent('1');
  });

  it('renders priority 10', () => {
    render(<PriorityBadge priority={10} />);
    expect(screen.getByTestId('leadPriorityBadge')).toHaveTextContent('10');
  });
});
