/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { WorkflowValidationCallouts } from '.';
import type { ValidationItem } from '../types';

const defaultProps = {
  workflowValidationItems: [] as readonly ValidationItem[],
};

describe('WorkflowValidationCallouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the errors callout when there are no items', () => {
    render(<WorkflowValidationCallouts {...defaultProps} />);

    expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
  });

  it('does not render the warnings callout when there are no items', () => {
    render(<WorkflowValidationCallouts {...defaultProps} />);

    expect(screen.queryByTestId('workflowValidationWarningsCallout')).not.toBeInTheDocument();
  });

  it('renders the errors callout when error-level items exist', () => {
    const items: ValidationItem[] = [{ level: 'error', message: 'Error 1' }];

    render(<WorkflowValidationCallouts workflowValidationItems={items} />);

    expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
  });

  it('displays all error-level items in the errors callout', () => {
    const items: ValidationItem[] = [
      { level: 'error', message: 'First error' },
      { level: 'error', message: 'Second error' },
    ];

    render(<WorkflowValidationCallouts workflowValidationItems={items} />);

    const callout = screen.getByTestId('workflowValidationErrorsCallout');

    expect(callout.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders the warnings callout when warning-level items exist', () => {
    const items: ValidationItem[] = [{ level: 'warning', message: 'Warning 1' }];

    render(<WorkflowValidationCallouts workflowValidationItems={items} />);

    expect(screen.getByTestId('workflowValidationWarningsCallout')).toBeInTheDocument();
  });

  it('does not render the errors callout when only warning-level items exist', () => {
    const items: ValidationItem[] = [{ level: 'warning', message: 'Warning 1' }];

    render(<WorkflowValidationCallouts workflowValidationItems={items} />);

    expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
  });

  it('renders both callouts when both levels exist', () => {
    const items: ValidationItem[] = [
      { level: 'error', message: 'Error message' },
      { level: 'warning', message: 'Warning message' },
    ];

    render(<WorkflowValidationCallouts workflowValidationItems={items} />);

    expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
    expect(screen.getByTestId('workflowValidationWarningsCallout')).toBeInTheDocument();
  });
});
