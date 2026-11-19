/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { downloadBlob } from '../../../../../common/utils/download_blob';
import { TestProviders } from '../../../../../common/mock';
import type { AggregatedWorkflowExecution } from '../../types';
import { DiagnosticReport } from '.';

jest.mock('../../../../../common/utils/download_blob', () => ({
  downloadBlob: jest.fn(),
}));

const mockDownloadBlob = downloadBlob as jest.Mock;

const defaultAggregatedExecution: AggregatedWorkflowExecution = {
  status: ExecutionStatus.FAILED,
  steps: [],
  workflowExecutions: null,
};

const defaultProps = {
  aggregatedExecution: defaultAggregatedExecution,
  executionUuid: 'test-uuid-123',
};

const writeTextMock = jest.fn();

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: writeTextMock },
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  writeTextMock.mockResolvedValue(undefined);
});

describe('DiagnosticReport', () => {
  describe('rendering', () => {
    it('renders the copy button', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('copyDiagnosticReportButton')).toBeInTheDocument();
    });

    it('renders the download button', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('downloadDiagnosticReportButton')).toBeInTheDocument();
    });

    it('renders copy button with correct aria-label', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByRole('button', { name: 'Copy diagnostic report' })).toBeInTheDocument();
    });

    it('renders download button with correct aria-label', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      expect(
        screen.getByRole('button', { name: 'Download diagnostic report' })
      ).toBeInTheDocument();
    });

    it('renders inspect button with correct aria-label', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByRole('button', { name: 'Inspect diagnostic report' })).toBeInTheDocument();
    });
  });

  describe('copy button', () => {
    it('calls navigator.clipboard.writeText when copy button is clicked', async () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('copyDiagnosticReportButton'));

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledTimes(1);
      });
    });

    it('passes the Markdown report content to clipboard.writeText', async () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('copyDiagnosticReportButton'));

      await waitFor(() => {
        const [content] = writeTextMock.mock.calls[0];
        expect(content).toContain('# Attack Discovery Diagnostic Report');
      });
    });
  });

  describe('download button', () => {
    it('calls downloadBlob when download button is clicked', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('downloadDiagnosticReportButton'));

      expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    });

    it('passes a Blob with text/markdown MIME type to downloadBlob', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('downloadDiagnosticReportButton'));

      const [blob] = mockDownloadBlob.mock.calls[0] as [Blob, string];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/markdown');
    });

    it('uses the executionUuid in the filename', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} executionUuid="uuid-xyz" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('downloadDiagnosticReportButton'));

      const [, filename] = mockDownloadBlob.mock.calls[0] as [Blob, string];
      expect(filename).toBe('attack-discovery-diagnostic-uuid-xyz.md');
    });

    it('falls back to a default filename when executionUuid is absent', () => {
      render(
        <TestProviders>
          <DiagnosticReport aggregatedExecution={defaultAggregatedExecution} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('downloadDiagnosticReportButton'));

      const [, filename] = mockDownloadBlob.mock.calls[0] as [Blob, string];
      expect(filename).toBe('attack-discovery-diagnostic.md');
    });

    it('passes the Markdown report content inside the Blob', async () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('downloadDiagnosticReportButton'));

      const [blob] = mockDownloadBlob.mock.calls[0] as [Blob, string];
      const text = await blob.text();
      expect(text).toContain('# Attack Discovery Diagnostic Report');
    });
  });

  describe('inspect button', () => {
    it('renders the inspect button', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('inspectDiagnosticReportButton')).toBeInTheDocument();
    });

    it('opens the inspect flyout when inspect button is clicked', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('inspectDiagnosticReportButton'));

      expect(screen.getByTestId('inspectDiagnosticReportFlyout')).toBeInTheDocument();
    });

    it('closes the flyout when the close button is clicked', () => {
      render(
        <TestProviders>
          <DiagnosticReport {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('inspectDiagnosticReportButton'));
      expect(screen.getByTestId('inspectDiagnosticReportFlyout')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('inspectDiagnosticReportFlyout')).not.toBeInTheDocument();
    });
  });
});
