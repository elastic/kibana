/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DefaultAlertRetrievalAccordion } from '.';
import { TestProviders } from '../../../../../common/mock';
import * as i18n from '../translations';

const defaultProps = {
  children: <div data-test-subj="mockChildren">{'Mock Children Content'}</div>,
  isEnabled: true,
  onToggle: jest.fn(),
};

describe('DefaultAlertRetrievalAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toggle switch rendering', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} />
        </TestProviders>
      );
    });

    it('renders the toggle switch', () => {
      expect(screen.getByTestId('defaultAlertRetrievalToggle')).toBeInTheDocument();
    });

    it('renders the toggle label', () => {
      expect(screen.getByText(i18n.DEFAULT_ALERT_RETRIEVAL_TOGGLE_LABEL)).toBeInTheDocument();
    });

    it('renders toggle as a switch input', () => {
      const toggle = screen.getByTestId('defaultAlertRetrievalToggle');

      expect(toggle).toHaveAttribute('type', 'button');
    });

    it('renders toggle with correct role', () => {
      const toggle = screen.getByTestId('defaultAlertRetrievalToggle');

      expect(toggle).toHaveAttribute('role', 'switch');
    });
  });

  describe('info icon tooltip', () => {
    it('renders the info icon', () => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultAlertRetrievalTooltip')).toBeInTheDocument();
    });
  });

  describe('toggle switch state', () => {
    it('renders checked when isEnabled is true', () => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultAlertRetrievalToggle')).toBeChecked();
    });

    it('renders unchecked when isEnabled is false', () => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultAlertRetrievalToggle')).not.toBeChecked();
    });
  });

  describe('toggle switch interaction', () => {
    it('calls onToggle with true when switched on', async () => {
      const onToggle = jest.fn();
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} onToggle={onToggle} />
        </TestProviders>
      );

      const toggle = screen.getByTestId('defaultAlertRetrievalToggle');
      await userEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onToggle with false when switched off', async () => {
      const onToggle = jest.fn();
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled onToggle={onToggle} />
        </TestProviders>
      );

      const toggle = screen.getByTestId('defaultAlertRetrievalToggle');
      await userEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('calls onToggle only once per click', async () => {
      const onToggle = jest.fn();
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} onToggle={onToggle} />
        </TestProviders>
      );

      const toggle = screen.getByTestId('defaultAlertRetrievalToggle');
      await userEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('when enabled', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled />
        </TestProviders>
      );
    });

    it('renders children content', () => {
      expect(screen.getByTestId('defaultAlertRetrievalContent')).toBeInTheDocument();
    });

    it('renders children inside the content area', () => {
      expect(screen.getByTestId('mockChildren')).toBeInTheDocument();
    });

    it('renders children text', () => {
      expect(screen.getByText('Mock Children Content')).toBeInTheDocument();
    });

    it('renders children as visible', () => {
      expect(screen.getByTestId('mockChildren')).toBeVisible();
    });
  });

  describe('when disabled', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} />
        </TestProviders>
      );
    });

    it('does not render the content area', () => {
      expect(screen.queryByTestId('defaultAlertRetrievalContent')).not.toBeInTheDocument();
    });

    it('does not render children', () => {
      expect(screen.queryByTestId('mockChildren')).not.toBeInTheDocument();
    });
  });

  describe('component memoization', () => {
    it('renders with displayName', () => {
      expect(DefaultAlertRetrievalAccordion.displayName).toBe('DefaultAlertRetrievalAccordion');
    });
  });

  describe('edge cases', () => {
    it('renders with empty children', () => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled>
            {null}
          </DefaultAlertRetrievalAccordion>
        </TestProviders>
      );

      expect(screen.getByTestId('defaultAlertRetrievalToggle')).toBeInTheDocument();
    });

    it('renders with multiple children', () => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled>
            <div data-test-subj="child1">{'Child 1'}</div>
            <div data-test-subj="child2">{'Child 2'}</div>
          </DefaultAlertRetrievalAccordion>
        </TestProviders>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
    });

    it('renders multiple children content', () => {
      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled>
            <div data-test-subj="child1">{'Child 1'}</div>
            <div data-test-subj="child2">{'Child 2'}</div>
          </DefaultAlertRetrievalAccordion>
        </TestProviders>
      );

      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('hides content when toggled from enabled to disabled', async () => {
      const { rerender } = render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} />
        </TestProviders>
      );

      expect(screen.queryByTestId('defaultAlertRetrievalContent')).not.toBeInTheDocument();
    });

    it('shows content when toggled from disabled to enabled', async () => {
      const { rerender } = render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultAlertRetrievalContent')).toBeInTheDocument();
    });

    it('updates toggle checked state when isEnabled changes', () => {
      const { rerender } = render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultAlertRetrievalToggle')).toBeChecked();
    });
  });

  describe('callback stability', () => {
    it('does not call onToggle on initial render', () => {
      const onToggle = jest.fn();

      render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} onToggle={onToggle} />
        </TestProviders>
      );

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('does not call onToggle when isEnabled prop changes', () => {
      const onToggle = jest.fn();
      const { rerender } = render(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled={false} onToggle={onToggle} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <DefaultAlertRetrievalAccordion {...defaultProps} isEnabled onToggle={onToggle} />
        </TestProviders>
      );

      expect(onToggle).not.toHaveBeenCalled();
    });
  });
});
