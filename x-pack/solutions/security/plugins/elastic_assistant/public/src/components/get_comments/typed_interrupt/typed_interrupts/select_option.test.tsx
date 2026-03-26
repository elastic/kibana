/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  SelectOptionInterruptValue,
  SelectOptionInterruptResumeValue,
} from '@kbn/elastic-assistant-common';
import { SelectOption } from './select_option';

describe('SelectOption', () => {
  const mockResumeGraph = jest.fn();
  const defaultInterrupt: SelectOptionInterruptValue = {
    type: 'SELECT_OPTION',
    threadId: 'test-thread-id',
    description: 'Please select an option:',
    options: [
      {
        label: 'Approve',
        value: 'approve',
        buttonColor: 'success',
      },
      {
        label: 'Deny',
        value: 'deny',
        buttonColor: 'danger',
      },
    ],
  };

  const defaultProps = {
    interrupt: defaultInterrupt,
    resumeGraph: mockResumeGraph,
    isLastInConversation: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the description', () => {
    render(<SelectOption {...defaultProps} />);
    expect(screen.getByText('Please select an option:')).toBeInTheDocument();
  });

  it('renders all option buttons with correct labels', () => {
    render(<SelectOption {...defaultProps} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('calls resumeGraph with correct parameters when an option is clicked', () => {
    render(<SelectOption {...defaultProps} />);
    const approveButton = screen.getByTestId('select-option-approve');

    fireEvent.click(approveButton);

    expect(mockResumeGraph).toHaveBeenCalledWith('test-thread-id', {
      type: 'SELECT_OPTION',
      value: 'approve',
    });
  });

  it('disables buttons when resumeValue is provided', () => {
    const resumedValue: SelectOptionInterruptResumeValue = {
      type: 'SELECT_OPTION',
      value: 'approve',
    };
    render(<SelectOption {...defaultProps} resumedValue={resumedValue} />);

    const approveButton = screen.getByTestId('select-option-approve');
    expect(approveButton).toBeDisabled();
  });

  it('disables buttons when interrupt is expired', () => {
    const expiredInterrupt = { ...defaultInterrupt, expired: true };
    render(<SelectOption {...defaultProps} interrupt={expiredInterrupt} />);

    const approveButton = screen.getByTestId('select-option-approve');
    expect(approveButton).toBeDisabled();
  });

  it('disables buttons when not last in conversation', () => {
    render(<SelectOption {...defaultProps} isLastInConversation={false} />);

    const approveButton = screen.getByTestId('select-option-approve');
    expect(approveButton).toBeDisabled();
  });

  it('shows outcome badge with selected option label when resumed', () => {
    const resumedValue: SelectOptionInterruptResumeValue = {
      type: 'SELECT_OPTION',
      value: 'approve',
    };
    render(<SelectOption {...defaultProps} resumedValue={resumedValue} />);

    const approveTexts = screen.getAllByText('Approve');
    expect(approveTexts).toHaveLength(2); // Button + Badge
  });

  it('shows "Expired" badge when interrupt is expired', () => {
    const expiredInterrupt = { ...defaultInterrupt, expired: true };
    render(<SelectOption {...defaultProps} interrupt={expiredInterrupt} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows "Expired" badge when not last in conversation and not resumed', () => {
    render(<SelectOption {...defaultProps} isLastInConversation={false} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows "Actioned" badge when resumed value does not match any option', () => {
    const resumedValue: SelectOptionInterruptResumeValue = {
      type: 'SELECT_OPTION',
      value: 'unknown-value',
    };
    render(<SelectOption {...defaultProps} resumedValue={resumedValue} />);

    expect(screen.getByText('Actioned')).toBeInTheDocument();
  });

  it('renders with correct test subject', () => {
    render(<SelectOption {...defaultProps} />);

    expect(screen.getByTestId('select-option-interrupt')).toBeInTheDocument();
  });

  it('updates internal state when option is selected', () => {
    render(<SelectOption {...defaultProps} />);
    const approveButton = screen.getByTestId('select-option-approve');

    fireEvent.click(approveButton);

    // After clicking, the button should be disabled due to state change
    expect(approveButton).toBeDisabled();
  });
});
