/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { SummaryCount } from '.';

describe('SummaryCount', () => {
  const defaultProps = {
    alertsCount: 20,
    attackDiscoveriesCount: 5,
    lastUpdated: new Date(),
  };

  it('renders the expected count of attack discoveries', () => {
    render(<SummaryCount {...defaultProps} />);

    const discoveriesCount = screen.getByTestId('discoveriesCount');

    expect(discoveriesCount).toHaveTextContent('5 discoveries');
  });

  it('renders the expected alerts count', () => {
    render(<SummaryCount {...defaultProps} />);

    const alertsCount = screen.getByTestId('alertsCount');

    expect(alertsCount).toHaveTextContent('20 alerts');
  });

  it('renders a humanized last generated when lastUpdated is provided', () => {
    render(<SummaryCount {...defaultProps} />);

    const lastGenerated = screen.getByTestId('lastGenerated');

    expect(lastGenerated).toHaveTextContent('Generated: a few seconds ago');
  });

  it('should NOT render the last generated date when lastUpdated is null', () => {
    render(<SummaryCount {...defaultProps} lastUpdated={null} />);

    const lastGenerated = screen.queryByTestId('lastGenerated');

    expect(lastGenerated).not.toBeInTheDocument();
  });
});
