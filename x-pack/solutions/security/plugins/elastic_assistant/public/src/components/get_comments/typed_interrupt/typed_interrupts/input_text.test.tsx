/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  InputTextInterruptValue,
  InputTextInterruptResumeValue,
} from '@kbn/elastic-assistant-common';
import { InputText } from './input_text';

describe('InputText', () => {
  const mockResumeGraph = jest.fn();
  const defaultInterruptValue: InputTextInterruptValue = {
    type: 'INPUT_TEXT',
    threadId: 'test-thread-id',
    description: 'Please enter some text',
    placeholder: 'Type here...',
  };

  const defaultProps = {
    interruptValue: defaultInterruptValue,
    resumeGraph: mockResumeGraph,
    isLastInConversation: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with interrupt description', () => {
    render(<InputText {...defaultProps} />);
    
    expect(screen.getByText('Please enter some text')).toBeInTheDocument();
  });

  it('renders input field with placeholder text', () => {
    render(<InputText {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<InputText {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('updates input value when user types', () => {
    render(<InputText {...defaultProps} />);
    const input = screen.getByPlaceholderText('Type here...');
    
    fireEvent.change(input, { target: { value: 'test input' } });
    
    expect(input).toHaveValue('test input');
  });

  it('calls resumeGraph with correct parameters when submit is clicked', () => {
    render(<InputText {...defaultProps} />);
    const input = screen.getByPlaceholderText('Type here...');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    fireEvent.change(input, { target: { value: 'test input' } });
    fireEvent.click(submitButton);
    
    expect(mockResumeGraph).toHaveBeenCalledWith('test-thread-id', {
      type: 'INPUT_TEXT',
      value: 'test input',
    });
  });

  it('renders with default placeholder when none provided', () => {
    const interruptWithoutPlaceholder = {
      ...defaultInterruptValue,
      placeholder: undefined,
    };
    render(
      <InputText {...defaultProps} interruptValue={interruptWithoutPlaceholder} />
    );
    
    expect(screen.getByPlaceholderText('Enter text to continue...')).toBeInTheDocument();
  });

  it('initializes with resume value when provided', () => {
    const resumeValue: InputTextInterruptResumeValue = {
      type: 'INPUT_TEXT',
      value: 'initial value',
    };
    render(<InputText {...defaultProps} resumeValue={resumeValue} />);
    const input = screen.getByDisplayValue('initial value');
    
    expect(input).toBeInTheDocument();
  });

  it('disables input and button when interrupt is expired', () => {
    const expiredInterrupt = {
      ...defaultInterruptValue,
      expired: true,
    };
    render(<InputText {...defaultProps} interruptValue={expiredInterrupt} />);
    const input = screen.getByPlaceholderText('Type here...');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('disables input and button when not last in conversation', () => {
    render(<InputText {...defaultProps} isLastInConversation={false} />);
    const input = screen.getByPlaceholderText('Type here...');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('disables input and button when resume value exists', () => {
    const resumeValue: InputTextInterruptResumeValue = {
      type: 'INPUT_TEXT',
      value: 'submitted value',
    };
    render(<InputText {...defaultProps} resumeValue={resumeValue} />);
    const input = screen.getByDisplayValue('submitted value');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('shows "Expired" badge when interrupt is expired', () => {
    const expiredInterrupt = {
      ...defaultInterruptValue,
      expired: true,
    };
    render(<InputText {...defaultProps} interruptValue={expiredInterrupt} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows "Expired" badge when not last in conversation and no resume value', () => {
    render(<InputText {...defaultProps} isLastInConversation={false} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows submitted value badge when resume value exists', () => {
    const resumeValue: InputTextInterruptResumeValue = {
      type: 'INPUT_TEXT',
      value: 'my response',
    };
    render(<InputText {...defaultProps} resumeValue={resumeValue} />);
    
    expect(screen.getByText('my response')).toBeInTheDocument();
  });

  it('does not show badge when resume value exists but has empty value', () => {
    const resumeValue: InputTextInterruptResumeValue = {
      type: 'INPUT_TEXT',
      value: '',
    };
    render(<InputText {...defaultProps} resumeValue={resumeValue} />);
    
    expect(screen.queryByRole('generic', { name: /badge/i })).not.toBeInTheDocument();
  });

  it('shows "Actioned" badge when resume value exists but value is undefined', () => {
    // Creating a resume value object that simulates runtime undefined value
    const resumeValue = {
      type: 'INPUT_TEXT',
      value: undefined,
    } as unknown as InputTextInterruptResumeValue;
    render(<InputText {...defaultProps} resumeValue={resumeValue} />);
    
    expect(screen.getByText('Actioned')).toBeInTheDocument();
  });

  it('renders with data-test-subj attribute', () => {
    render(<InputText {...defaultProps} />);
    
    expect(screen.getByTestId('input-text-interrupt')).toBeInTheDocument();
  });

  it('does not show any badge when interrupt is active and no resume value', () => {
    render(<InputText {...defaultProps} />);
    
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    expect(screen.queryByText('Actioned')).not.toBeInTheDocument();
  });
});