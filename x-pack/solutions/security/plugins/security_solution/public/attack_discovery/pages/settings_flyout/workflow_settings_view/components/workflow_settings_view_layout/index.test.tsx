/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { WorkflowSettingsViewLayout } from '.';
import type { ValidationItem } from '../types';

const defaultSteps = [
  {
    children: <div data-test-subj="step1Content" />,
    title: 'Step 1',
  },
  {
    children: <div data-test-subj="step2Content" />,
    title: 'Step 2',
  },
  {
    children: <div data-test-subj="step3Content" />,
    title: 'Step 3',
  },
];

const defaultProps = {
  steps: defaultSteps,
  workflowValidationItems: [] as readonly ValidationItem[],
};

describe('WorkflowSettingsViewLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all step children', () => {
    render(<WorkflowSettingsViewLayout {...defaultProps} />);

    expect(screen.getByTestId('step1Content')).toBeInTheDocument();
    expect(screen.getByTestId('step2Content')).toBeInTheDocument();
    expect(screen.getByTestId('step3Content')).toBeInTheDocument();
  });

  it('renders step titles', () => {
    render(<WorkflowSettingsViewLayout {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 3' })).toBeInTheDocument();
  });

  describe('validation errors callout', () => {
    it('does not show validation callout when no items', () => {
      render(<WorkflowSettingsViewLayout {...defaultProps} />);

      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('workflowValidationWarningsCallout')).not.toBeInTheDocument();
    });

    it('shows error callout when error-level items exist', () => {
      const items: ValidationItem[] = [
        { level: 'error', message: 'Error 1' },
        { level: 'error', message: 'Error 2' },
      ];

      render(<WorkflowSettingsViewLayout {...defaultProps} workflowValidationItems={items} />);

      expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
    });

    it('displays all error-level items in the errors callout', () => {
      const items: ValidationItem[] = [
        { level: 'error', message: 'First error' },
        { level: 'error', message: 'Second error' },
        { level: 'error', message: 'Third error' },
      ];

      render(<WorkflowSettingsViewLayout {...defaultProps} workflowValidationItems={items} />);

      const callout = screen.getByTestId('workflowValidationErrorsCallout');
      const listItems = callout.querySelectorAll('li');

      expect(listItems).toHaveLength(3);

      items.forEach((item, index) => {
        expect(listItems[index]).toHaveTextContent(item.message);
      });
    });

    it('shows warning callout when warning-level items exist', () => {
      const items: ValidationItem[] = [{ level: 'warning', message: 'Warning 1' }];

      render(<WorkflowSettingsViewLayout {...defaultProps} workflowValidationItems={items} />);

      expect(screen.getByTestId('workflowValidationWarningsCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
    });

    it('displays all warning-level items in the warnings callout', () => {
      const items: ValidationItem[] = [
        { level: 'warning', message: 'First warning' },
        { level: 'warning', message: 'Second warning' },
      ];

      render(<WorkflowSettingsViewLayout {...defaultProps} workflowValidationItems={items} />);

      const callout = screen.getByTestId('workflowValidationWarningsCallout');
      const listItems = callout.querySelectorAll('li');

      expect(listItems).toHaveLength(2);

      items.forEach((item, index) => {
        expect(listItems[index]).toHaveTextContent(item.message);
      });
    });

    it('shows both error and warning callouts when both levels exist', () => {
      const items: ValidationItem[] = [
        { level: 'error', message: 'Error message' },
        { level: 'warning', message: 'Warning message' },
      ];

      render(<WorkflowSettingsViewLayout {...defaultProps} workflowValidationItems={items} />);

      expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
      expect(screen.getByTestId('workflowValidationWarningsCallout')).toBeInTheDocument();

      const errorCallout = screen.getByTestId('workflowValidationErrorsCallout');
      expect(errorCallout.querySelectorAll('li')).toHaveLength(1);
      expect(errorCallout.querySelectorAll('li')[0]).toHaveTextContent('Error message');

      const warningCallout = screen.getByTestId('workflowValidationWarningsCallout');
      expect(warningCallout.querySelectorAll('li')).toHaveLength(1);
      expect(warningCallout.querySelectorAll('li')[0]).toHaveTextContent('Warning message');
    });
  });
});
