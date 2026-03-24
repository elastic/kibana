/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FindingsDistributionBar } from './findings_distribution_bar';
import { TestProvider } from '../../../test/test_provider';

const defaultProps = {
  passed: 123,
  failed: 456,
  distributionOnClick: jest.fn(),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProvider>{children}</TestProvider>
);

describe('FindingsDistributionBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render passed and failed filter buttons with correct accessibility labels', () => {
    render(
      <TestWrapper>
        <FindingsDistributionBar {...defaultProps} />
      </TestWrapper>
    );

    // Check that passed findings filter button has proper accessibility attributes
    const passedButton = screen.getByTestId('distribution_bar_passed');
    expect(passedButton).toHaveAttribute(
      'aria-label',
      'Filter for passed findings. Passed Findings: 123'
    );
    expect(passedButton).toHaveAttribute(
      'title',
      'Filter for passed findings. Passed Findings: 123'
    );

    // Check that failed findings filter button has proper accessibility attributes
    const failedButton = screen.getByTestId('distribution_bar_failed');
    expect(failedButton).toHaveAttribute(
      'aria-label',
      'Filter for failed findings. Failed Findings: 456'
    );
    expect(failedButton).toHaveAttribute(
      'title',
      'Filter for failed findings. Failed Findings: 456'
    );
  });

  it('should call distributionOnClick with correct evaluation when passed button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = jest.fn();

    render(
      <TestWrapper>
        <FindingsDistributionBar {...defaultProps} distributionOnClick={mockOnClick} />
      </TestWrapper>
    );

    const passedButton = screen.getByTestId('distribution_bar_passed');
    await user.click(passedButton);

    expect(mockOnClick).toHaveBeenCalledWith('passed');
  });

  it('should call distributionOnClick with correct evaluation when failed button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = jest.fn();

    render(
      <TestWrapper>
        <FindingsDistributionBar {...defaultProps} distributionOnClick={mockOnClick} />
      </TestWrapper>
    );

    const failedButton = screen.getByTestId('distribution_bar_failed');
    await user.click(failedButton);

    expect(mockOnClick).toHaveBeenCalledWith('failed');
  });

  it('should render buttons as proper button elements with correct role', () => {
    render(
      <TestWrapper>
        <FindingsDistributionBar {...defaultProps} />
      </TestWrapper>
    );

    const passedButton = screen.getByTestId('distribution_bar_passed');
    const failedButton = screen.getByTestId('distribution_bar_failed');

    expect(passedButton.tagName).toBe('BUTTON');
    expect(failedButton.tagName).toBe('BUTTON');
  });
});
