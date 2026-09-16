/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { StepAccordion } from '.';

const defaultProps = {
  description: 'Test description text',
  stepNumber: '1',
  title: 'Test Step Title',
};

describe('StepAccordion', () => {
  it('renders the panel with the default data-test-subj', () => {
    render(<StepAccordion {...defaultProps} />);

    expect(screen.getByTestId('stepAccordion')).toBeInTheDocument();
  });

  it('renders the panel with a custom data-test-subj', () => {
    render(<StepAccordion {...defaultProps} data-test-subj="customStep" />);

    expect(screen.getByTestId('customStep')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<StepAccordion {...defaultProps} />);

    expect(screen.getByText('Test Step Title')).toBeInTheDocument();
  });

  it('renders the description when accordion is open', () => {
    render(<StepAccordion {...defaultProps} initialIsOpen />);

    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  it('renders the avatar with the step number', () => {
    render(<StepAccordion {...defaultProps} />);

    expect(screen.getByTestId('stepAccordionAvatar')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <StepAccordion {...defaultProps}>
        <div data-test-subj="testChild">{'Child content'}</div>
      </StepAccordion>
    );

    expect(screen.getByTestId('testChild')).toBeInTheDocument();
  });

  it('renders without children when none are provided', () => {
    render(<StepAccordion {...defaultProps} />);

    expect(screen.getByTestId('stepAccordionDescription')).toBeInTheDocument();
  });

  it('renders with hasError=true without crashing', () => {
    render(<StepAccordion {...defaultProps} hasError />);

    expect(screen.getByTestId('stepAccordion')).toBeInTheDocument();
  });
});
