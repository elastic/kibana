/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { StepDataModal } from '.';
import type { StepDataModalProps } from '.';
import { TestProviders } from '../../../../common/mock';
import { useWorkflowEditorLink } from '../../use_workflow_editor_link';

jest.mock('../../use_workflow_editor_link');

const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const createJsonAlert = (fields: Record<string, string>): string => JSON.stringify(fields);

const mockAlerts = [
  createJsonAlert({
    _id: 'alert-1',
    'kibana.alert.rule.name': 'Test Rule',
    'kibana.alert.severity': 'high',
  }),
  createJsonAlert({
    _id: 'alert-2',
    'kibana.alert.rule.name': 'Another Rule',
    'kibana.alert.severity': 'medium',
  }),
];

const mockDiscoveries = [
  {
    alert_ids: ['alert-1', 'alert-2'],
    details_markdown: '## Details\n- Found **suspicious activity**',
    entity_summary_markdown: 'Suspicious activity on `host-1`',
    summary_markdown: 'A multi-stage attack was detected',
    title: 'Multi-stage Attack',
  },
];

describe('StepDataModal', () => {
  const mockOnClose = jest.fn();

  const defaultProps: StepDataModalProps = {
    dataCount: 2,
    dataType: 'alerts',
    extractionStrategy: 'default_esql',
    items: mockAlerts,
    onClose: mockOnClose,
    stepName: 'Alert retrieval',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });
  });

  describe('rendering', () => {
    it('renders the modal', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModal')).toBeInTheDocument();
    });

    it('renders the step name in the header', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Alert retrieval')).toBeInTheDocument();
    });

    it('renders the data count in the header', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} dataCount={42} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalDataCount')).toHaveTextContent('42');
    });

    it('renders "Unknown" when data count is null', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} dataCount={null} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalDataCount')).toHaveTextContent('Unknown');
    });

    it('renders "ES|QL" badge for default_esql extraction strategy', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} extractionStrategy="default_esql" />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalExtractionStrategy')).toHaveTextContent('ES|QL');
    });

    it('renders "Custom query" badge for default_custom_query extraction strategy', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} extractionStrategy="default_custom_query" />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalExtractionStrategy')).toHaveTextContent(
        'Custom query'
      );
    });

    it('renders "custom workflow" badge for custom_workflow extraction strategy', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} extractionStrategy="custom_workflow" />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalExtractionStrategy')).toHaveTextContent(
        'custom workflow'
      );
    });

    it('does not render extraction strategy badge when not provided', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} extractionStrategy={undefined} />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepDataModalExtractionStrategy')).not.toBeInTheDocument();
    });

    it('hides header count and shows workflow alerts summary when workflowName is provided for alerts', () => {
      render(
        <TestProviders>
          <StepDataModal
            {...defaultProps}
            workflowId="workflow-legacy"
            workflowName="Default Alert Retrieval"
            workflowRunId="run-123"
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepDataModalDataCount')).not.toBeInTheDocument();

      const summaryLine = screen.getByTestId('workflowAlertsSummaryLine');

      expect(summaryLine).toBeInTheDocument();
      expect(screen.getByTestId('workflowAlertsSummaryLink')).toHaveTextContent(
        'Default Alert Retrieval'
      );
      expect(summaryLine).toHaveTextContent('provided as context to Attack discovery');
    });

    it('renders workflow name as a link when editorUrl is available', () => {
      mockUseWorkflowEditorLink.mockReturnValue({
        editorUrl: 'http://localhost:5601/app/workflows/workflow-legacy',
        navigateToEditor: jest.fn(),
        resolvedWorkflowId: null,
      });

      render(
        <TestProviders>
          <StepDataModal
            {...defaultProps}
            workflowId="workflow-legacy"
            workflowName="Default Alert Retrieval"
            workflowRunId="run-123"
          />
        </TestProviders>
      );

      const link = screen.getByTestId('workflowAlertsSummaryLink');

      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href');
    });

    it('renders workflow name as bold text when editorUrl is not available', () => {
      render(
        <TestProviders>
          <StepDataModal
            {...defaultProps}
            workflowId="workflow-legacy"
            workflowName="Default Alert Retrieval"
            workflowRunId="run-123"
          />
        </TestProviders>
      );

      const link = screen.getByTestId('workflowAlertsSummaryLink');

      expect(link.tagName).toBe('STRONG');
    });

    it('includes count in description when workflowName and dataCount are both available', () => {
      render(
        <TestProviders>
          <StepDataModal
            {...defaultProps}
            dataCount={75}
            workflowId="workflow-legacy"
            workflowName="Default Alert Retrieval"
            workflowRunId="run-123"
          />
        </TestProviders>
      );

      const summaryLine = screen.getByTestId('workflowAlertsSummaryLine');

      expect(summaryLine).toHaveTextContent(
        '75 alerts from workflow Default Alert Retrieval provided as context to Attack discovery'
      );
    });

    it('shows "Alerts from workflow" in description when dataCount is null and workflowName is provided', () => {
      render(
        <TestProviders>
          <StepDataModal
            {...defaultProps}
            dataCount={null}
            workflowId="workflow-legacy"
            workflowName="Default Alert Retrieval"
            workflowRunId="run-123"
          />
        </TestProviders>
      );

      const summaryLine = screen.getByTestId('workflowAlertsSummaryLine');

      expect(summaryLine).toHaveTextContent(
        'Alerts from workflow Default Alert Retrieval provided as context to Attack discovery'
      );
    });

    it('does not render workflow description when workflowName is undefined', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepDataModalWorkflowDescription')).not.toBeInTheDocument();

      expect(screen.getByTestId('stepDataModalDataCount')).toBeInTheDocument();
    });
  });

  describe('raw data display', () => {
    it('displays code block with raw data', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalCodeBlock')).toBeInTheDocument();
    });

    it('displays JSON content for discovery items', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} dataType="discoveries" items={mockDiscoveries} />
        </TestProviders>
      );

      const codeBlock = screen.getByTestId('stepDataModalCodeBlock');

      expect(codeBlock).toHaveTextContent('Multi-stage Attack');
    });

    it('does not render tabs', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepDataModalFormattedTab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stepDataModalRawTab')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when items array is empty', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} items={[]} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalEmptyState')).toBeInTheDocument();
    });

    it('does not render code block when items array is empty', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} items={[]} />
        </TestProviders>
      );

      expect(screen.queryByTestId('stepDataModalCodeBlock')).not.toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders close button', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalCloseButton')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('stepDataModalCloseButton'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders copy all button', () => {
      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('stepDataModalCopyAllButton')).toBeInTheDocument();
    });

    it('copies data to clipboard when copy all button is clicked', () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);

      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      render(
        <TestProviders>
          <StepDataModal {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('stepDataModalCopyAllButton'));

      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });
  });
});
