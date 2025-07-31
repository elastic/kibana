/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparePercentage } from './compare_percentage';

describe('ComparePercentage', () => {
  const defaultProps = {
    currentCount: 10,
    previousCount: 5,
    stat: 'alerts',
    statType: 'detections',
    timeRange: 'last 7 days',
  };

  it('renders positive percentage change', () => {
    render(<ComparePercentage {...defaultProps} />);
    expect(screen.getByTestId('comparePercentage')).toBeInTheDocument();
  });

  it('renders negative percentage change', () => {
    render(<ComparePercentage {...defaultProps} currentCount={5} previousCount={10} />);
    expect(screen.getByTestId('comparePercentage')).toBeInTheDocument();
  });

  it('renders no change when percentage is zero', () => {
    render(<ComparePercentage {...defaultProps} currentCount={10} previousCount={10} />);
    expect(screen.getByTestId('comparePercentage')).toBeInTheDocument();
  });

  it('returns null if previousCount is 0', () => {
    const { container } = render(<ComparePercentage {...defaultProps} previousCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null if currentCount is 0', () => {
    const { container } = render(<ComparePercentage {...defaultProps} currentCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
