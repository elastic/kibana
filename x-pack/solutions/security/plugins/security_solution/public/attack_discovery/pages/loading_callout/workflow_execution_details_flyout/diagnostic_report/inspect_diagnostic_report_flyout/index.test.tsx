/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { InspectDiagnosticReportFlyout } from '.';

const mockOnClose = jest.fn();

const testReport = `# Attack Discovery Diagnostic Report

## Summary
Test diagnostic report content`;

const defaultProps = {
  onClose: mockOnClose,
  report: testReport,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InspectDiagnosticReportFlyout', () => {
  describe('rendering', () => {
    it('renders the flyout', () => {
      render(<InspectDiagnosticReportFlyout {...defaultProps} />);

      expect(screen.getByTestId('inspectDiagnosticReportFlyout')).toBeInTheDocument();
    });

    it('renders the title "Inspect diagnostic report"', () => {
      render(<InspectDiagnosticReportFlyout {...defaultProps} />);

      expect(screen.getByText('Inspect diagnostic report')).toBeInTheDocument();
    });

    it('renders the Markdown content', () => {
      render(<InspectDiagnosticReportFlyout {...defaultProps} />);

      expect(screen.getByText(/Attack Discovery Diagnostic Report/)).toBeInTheDocument();
    });
  });

  describe('closing', () => {
    it('calls onClose when flyout is closed', () => {
      render(<InspectDiagnosticReportFlyout {...defaultProps} />);

      // The flyout should be in the document
      expect(screen.getByTestId('inspectDiagnosticReportFlyout')).toBeInTheDocument();

      // Find the close button - EuiFlyout renders a close button with aria-label
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
