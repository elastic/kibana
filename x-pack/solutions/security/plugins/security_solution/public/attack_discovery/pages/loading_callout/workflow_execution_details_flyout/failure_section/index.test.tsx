/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import type { AggregatedWorkflowExecution } from '../../types';
import { FailureSection } from '.';
import { TroubleshootWithAi } from '../troubleshoot_with_ai';
import { DiagnosticReport } from '../diagnostic_report';

jest.mock('../failure_actions', () => ({
  FailureActions: jest.fn(() => <div data-test-subj="failureActions">{'Mock FailureActions'}</div>),
}));

jest.mock('../troubleshoot_with_ai', () => ({
  TroubleshootWithAi: jest.fn(() => (
    <div data-test-subj="troubleshootWithAi">{'Mock TroubleshootWithAi'}</div>
  )),
}));

jest.mock('../diagnostic_report', () => ({
  DiagnosticReport: jest.fn(() => (
    <div data-test-subj="diagnosticReport">{'Mock DiagnosticReport'}</div>
  )),
}));

const MockTroubleshootWithAi = TroubleshootWithAi as jest.MockedFunction<typeof TroubleshootWithAi>;
const MockDiagnosticReport = DiagnosticReport as jest.MockedFunction<typeof DiagnosticReport>;

const mockAggregatedExecution: AggregatedWorkflowExecution = {
  status: ExecutionStatus.FAILED,
  steps: [],
  workflowExecutions: null,
};

const defaultProps = {
  aggregatedExecution: mockAggregatedExecution,
  generationStatus: 'failed' as const,
};

describe('FailureSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders TroubleshootWithAi', () => {
    render(<FailureSection {...defaultProps} />);

    expect(screen.getByTestId('troubleshootWithAi')).toBeInTheDocument();
  });

  it('renders DiagnosticReport', () => {
    render(<FailureSection {...defaultProps} />);

    expect(screen.getByTestId('diagnosticReport')).toBeInTheDocument();
  });

  it('renders FailureActions when failureReason is provided', () => {
    render(<FailureSection {...defaultProps} failureReason="something went wrong" />);

    expect(screen.getByTestId('failureActions')).toBeInTheDocument();
  });

  it('does NOT render FailureActions when failureReason is undefined', () => {
    render(<FailureSection {...defaultProps} />);

    expect(screen.queryByTestId('failureActions')).not.toBeInTheDocument();
  });

  it('does NOT render FailureActions when failureReason is null', () => {
    render(<FailureSection {...defaultProps} failureReason={undefined} />);

    expect(screen.queryByTestId('failureActions')).not.toBeInTheDocument();
  });

  describe('prop forwarding to TroubleshootWithAi', () => {
    beforeEach(() => {
      MockTroubleshootWithAi.mockClear();
    });

    it('passes sourceMetadata to TroubleshootWithAi', () => {
      const sourceMetadata = { rule_id: 'rule-1', rule_name: 'My Rule' };

      render(<FailureSection {...defaultProps} sourceMetadata={sourceMetadata} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ sourceMetadata }),
        expect.anything()
      );
    });

    it('passes averageSuccessfulDurationMs to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} averageSuccessfulDurationMs={3000} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ averageSuccessfulDurationMs: 3000 }),
        expect.anything()
      );
    });

    it('passes configuredMaxAlerts to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} configuredMaxAlerts={500} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ configuredMaxAlerts: 500 }),
        expect.anything()
      );
    });

    it('passes connectorActionTypeId to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} connectorActionTypeId=".gemini" />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ connectorActionTypeId: '.gemini' }),
        expect.anything()
      );
    });

    it('passes connectorModel to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} connectorModel="gemini-2.5-pro" />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ connectorModel: 'gemini-2.5-pro' }),
        expect.anything()
      );
    });

    it('passes dateRangeEnd to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} dateRangeEnd="2025-06-01T00:00:00.000Z" />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ dateRangeEnd: '2025-06-01T00:00:00.000Z' }),
        expect.anything()
      );
    });

    it('passes dateRangeStart to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} dateRangeStart="2025-05-31T00:00:00.000Z" />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ dateRangeStart: '2025-05-31T00:00:00.000Z' }),
        expect.anything()
      );
    });

    it('passes duplicatesDroppedCount to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} duplicatesDroppedCount={2} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ duplicatesDroppedCount: 2 }),
        expect.anything()
      );
    });

    it('passes generatedCount to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} generatedCount={9} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ generatedCount: 9 }),
        expect.anything()
      );
    });

    it('passes hallucinationsFilteredCount to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} hallucinationsFilteredCount={1} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ hallucinationsFilteredCount: 1 }),
        expect.anything()
      );
    });

    it('passes perWorkflowAlertRetrieval to TroubleshootWithAi', () => {
      const perWorkflowAlertRetrieval = [
        {
          alertsContextCount: 10,
          extractionStrategy: 'default_esql',
          workflowId: 'wf-1',
          workflowRunId: 'run-1',
        },
      ];

      render(
        <FailureSection {...defaultProps} perWorkflowAlertRetrieval={perWorkflowAlertRetrieval} />
      );

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ perWorkflowAlertRetrieval }),
        expect.anything()
      );
    });

    it('passes persistedCount to TroubleshootWithAi', () => {
      render(<FailureSection {...defaultProps} persistedCount={6} />);

      expect(MockTroubleshootWithAi).toHaveBeenCalledWith(
        expect.objectContaining({ persistedCount: 6 }),
        expect.anything()
      );
    });
  });

  describe('prop forwarding to DiagnosticReport', () => {
    beforeEach(() => {
      MockDiagnosticReport.mockClear();
    });

    it('passes sourceMetadata to DiagnosticReport', () => {
      const sourceMetadata = { rule_id: 'rule-2', rule_name: 'Another Rule' };

      render(<FailureSection {...defaultProps} sourceMetadata={sourceMetadata} />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ sourceMetadata }),
        expect.anything()
      );
    });

    it('passes averageSuccessfulDurationMs to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} averageSuccessfulDurationMs={750} />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ averageSuccessfulDurationMs: 750 }),
        expect.anything()
      );
    });

    it('passes configuredMaxAlerts to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} configuredMaxAlerts={150} />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ configuredMaxAlerts: 150 }),
        expect.anything()
      );
    });

    it('passes connectorActionTypeId to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} connectorActionTypeId=".inference" />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ connectorActionTypeId: '.inference' }),
        expect.anything()
      );
    });

    it('passes connectorModel to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} connectorModel="gpt-4-turbo" />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ connectorModel: 'gpt-4-turbo' }),
        expect.anything()
      );
    });

    it('passes duplicatesDroppedCount to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} duplicatesDroppedCount={4} />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ duplicatesDroppedCount: 4 }),
        expect.anything()
      );
    });

    it('passes generatedCount to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} generatedCount={15} />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ generatedCount: 15 }),
        expect.anything()
      );
    });

    it('passes persistedCount to DiagnosticReport', () => {
      render(<FailureSection {...defaultProps} persistedCount={11} />);

      expect(MockDiagnosticReport).toHaveBeenCalledWith(
        expect.objectContaining({ persistedCount: 11 }),
        expect.anything()
      );
    });
  });
});
