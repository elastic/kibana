/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparePercentageBadge } from './compare_percentage_badge';

describe('ComparePercentageBadge', () => {
  it('renders nothing if previousCount is 0', () => {
    render(
      <ComparePercentageBadge currentCount={10} previousCount={0} stat="Alerts" statType="count" />
    );
    expect(screen.queryByTestId('comparePercentageBadge')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing if currentCount is 0', () => {
    render(
      <ComparePercentageBadge currentCount={0} previousCount={10} stat="Alerts" statType="count" />
    );
    expect(screen.queryByTestId('comparePercentageBadge')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders positive percentage change', () => {
    render(
      <ComparePercentageBadge currentCount={20} previousCount={10} stat="Alerts" statType="count" />
    );
    expect(screen.getByTestId('comparePercentageBadge')).toBeInTheDocument();
    expect(screen.getByText('+100.0%')).toBeInTheDocument();
  });

  it('renders negative percentage change', () => {
    render(
      <ComparePercentageBadge currentCount={5} previousCount={10} stat="Alerts" statType="count" />
    );
    expect(screen.getByTestId('comparePercentageBadge')).toBeInTheDocument();
    expect(screen.getByText('-50.0%')).toBeInTheDocument();
  });

  it('renders zero percentage change', () => {
    render(
      <ComparePercentageBadge currentCount={10} previousCount={10} stat="Alerts" statType="count" />
    );
    expect(screen.getByTestId('comparePercentageBadge')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('renders description if provided', () => {
    render(
      <ComparePercentageBadge
        currentCount={10}
        previousCount={10}
        stat="Alerts"
        statType="count"
        description="Test description"
      />
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders timeRange if provided', () => {
    render(
      <ComparePercentageBadge
        currentCount={10}
        previousCount={5}
        stat="Alerts"
        statType="count"
        timeRange="Last 7 days"
      />
    );
    expect(screen.getByText(/Last 7 days/)).toBeInTheDocument();
  });
});
