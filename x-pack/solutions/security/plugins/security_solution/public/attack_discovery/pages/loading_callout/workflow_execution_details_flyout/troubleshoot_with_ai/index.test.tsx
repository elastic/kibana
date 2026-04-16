/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { THREAT_HUNTING_AGENT_ID } from '../../../../../../common/constants';

// Re-exported from @kbn/discoveries-plugin/common/constants
const DIAGNOSTIC_REPORT_ATTACHMENT_TYPE = 'diagnostic_report';
import { TestProviders } from '../../../../../common/mock';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../../common/lib/telemetry';
import type { AggregatedWorkflowExecution } from '../../types';
import { TroubleshootWithAi } from '.';
import * as i18n from './translations';
import * as buildDiagnosticReportModule from '../diagnostic_report/helpers/build_diagnostic_report';

jest.mock('../../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn(),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

const mockOpenChat = jest.fn();
const mockReportEvent = jest.fn();
const mockUseAgentBuilderAvailability = jest.mocked(useAgentBuilderAvailability);
const mockUseKibana = useKibana as jest.Mock;

const mockAggregatedExecution: AggregatedWorkflowExecution = {
  status: ExecutionStatus.FAILED,
  steps: [
    {
      error: undefined,
      executionTimeMs: 1000,
      finishedAt: '2024-01-01T00:00:01.000Z',
      globalExecutionIndex: 0,
      id: 'step-1',
      input: undefined,
      output: undefined,
      pipelinePhase: 'retrieve_alerts',
      scopeStack: [],
      startedAt: '2024-01-01T00:00:00.000Z',
      state: undefined,
      status: ExecutionStatus.COMPLETED,
      stepExecutionIndex: 0,
      stepId: 'retrieve_alerts',
      stepType: 'alert_retrieval',
      topologicalIndex: 0,
      workflowId: 'workflow-1',
      workflowName: 'Alert Retrieval',
      workflowRunId: 'run-1',
    },
    {
      error: { message: 'LLM returned invalid JSON', type: 'generation_error' },
      executionTimeMs: 2000,
      finishedAt: '2024-01-01T00:00:03.000Z',
      globalExecutionIndex: 1,
      id: 'step-2',
      input: undefined,
      output: undefined,
      pipelinePhase: 'generate_discoveries',
      scopeStack: [],
      startedAt: '2024-01-01T00:00:01.000Z',
      state: undefined,
      status: ExecutionStatus.FAILED,
      stepExecutionIndex: 0,
      stepId: 'generate',
      stepType: 'generation',
      topologicalIndex: 1,
      workflowId: 'workflow-2',
      workflowName: 'Generation',
      workflowRunId: 'run-2',
    },
  ],
  workflowExecutions: null,
};

const defaultProps = {
  aggregatedExecution: mockAggregatedExecution,
  alertsContextCount: 50,
  connectorName: 'GPT-5 Chat',
  discoveriesCount: 3,
  executionUuid: 'exec-uuid-123',
  generationStatus: 'failed' as const,
};

describe('TroubleshootWithAi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: true,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: true,
      isAgentChatExperienceEnabled: true,
    });

    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {
          openChat: mockOpenChat,
        },
        telemetry: {
          reportEvent: mockReportEvent,
        },
      },
    });
  });

  it('renders the Troubleshoot with AI button', () => {
    render(
      <TestProviders>
        <TroubleshootWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('troubleshootWithAiButton')).toBeInTheDocument();
  });

  it('renders the button with correct text', () => {
    render(
      <TestProviders>
        <TroubleshootWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('troubleshootWithAiButton')).toHaveTextContent(
      i18n.TROUBLESHOOT_WITH_AI
    );
  });

  describe('disabled states', () => {
    it('is disabled when isAgentBuilderEnabled is false', () => {
      mockUseAgentBuilderAvailability.mockReturnValue({
        hasAgentBuilderPrivilege: false,
        hasValidAgentBuilderLicense: true,
        isAgentBuilderEnabled: false,
        isAgentChatExperienceEnabled: false,
      });

      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).toBeDisabled();
    });

    it('is disabled when generationStatus is undefined', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generationStatus={undefined} />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).toBeDisabled();
    });

    it('is disabled when generationStatus is started', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generationStatus="started" />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).toBeDisabled();
    });

    it('is disabled when generationStatus is succeeded', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generationStatus="succeeded" />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).toBeDisabled();
    });
  });

  describe('enabled states', () => {
    it('is enabled when generationStatus is failed', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generationStatus="failed" />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).not.toBeDisabled();
    });

    it('is enabled when generationStatus is canceled', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generationStatus="canceled" />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).not.toBeDisabled();
    });

    it('is enabled when generationStatus is dismissed', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generationStatus="dismissed" />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiButton')).not.toBeDisabled();
    });
  });

  describe('tooltip', () => {
    it('wraps the button in a tooltip when Agent Builder is unavailable', () => {
      mockUseAgentBuilderAvailability.mockReturnValue({
        hasAgentBuilderPrivilege: false,
        hasValidAgentBuilderLicense: true,
        isAgentBuilderEnabled: false,
        isAgentChatExperienceEnabled: false,
      });

      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('troubleshootWithAiTooltip')).toBeInTheDocument();
    });

    it('does not wrap the button in a tooltip when Agent Builder is available', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('troubleshootWithAiTooltip')).not.toBeInTheDocument();
    });
  });

  describe('buildDiagnosticReport params forwarding', () => {
    let buildDiagnosticReportSpy: jest.SpyInstance;

    beforeEach(() => {
      buildDiagnosticReportSpy = jest.spyOn(buildDiagnosticReportModule, 'buildDiagnosticReport');
    });

    afterEach(() => {
      buildDiagnosticReportSpy.mockRestore();
    });

    it('passes sourceMetadata to buildDiagnosticReport', () => {
      const sourceMetadata = { rule_id: 'rule-x', rule_name: 'Scheduled Rule' };

      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} sourceMetadata={sourceMetadata} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sourceMetadata })
      );
    });

    it('passes averageSuccessfulDurationMs to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} averageSuccessfulDurationMs={4500} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ averageSuccessfulDurationMs: 4500 })
      );
    });

    it('passes configuredMaxAlerts to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} configuredMaxAlerts={250} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ configuredMaxAlerts: 250 })
      );
    });

    it('passes connectorActionTypeId to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} connectorActionTypeId=".bedrock" />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ connectorActionTypeId: '.bedrock' })
      );
    });

    it('passes connectorModel to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} connectorModel="claude-3-opus" />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ connectorModel: 'claude-3-opus' })
      );
    });

    it('passes dateRangeEnd to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} dateRangeEnd="2025-07-01T00:00:00.000Z" />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ dateRangeEnd: '2025-07-01T00:00:00.000Z' })
      );
    });

    it('passes dateRangeStart to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} dateRangeStart="2025-06-30T00:00:00.000Z" />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ dateRangeStart: '2025-06-30T00:00:00.000Z' })
      );
    });

    it('passes duplicatesDroppedCount to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} duplicatesDroppedCount={3} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ duplicatesDroppedCount: 3 })
      );
    });

    it('passes generatedCount to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} generatedCount={20} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ generatedCount: 20 })
      );
    });

    it('passes hallucinationsFilteredCount to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} hallucinationsFilteredCount={7} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ hallucinationsFilteredCount: 7 })
      );
    });

    it('passes perWorkflowAlertRetrieval to buildDiagnosticReport', () => {
      const perWorkflowAlertRetrieval = [
        {
          alertsContextCount: 8,
          extractionStrategy: 'custom_workflow',
          workflowId: 'wf-retrieval',
          workflowRunId: 'run-retrieval',
        },
      ];

      render(
        <TestProviders>
          <TroubleshootWithAi
            {...defaultProps}
            perWorkflowAlertRetrieval={perWorkflowAlertRetrieval}
          />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ perWorkflowAlertRetrieval })
      );
    });

    it('passes persistedCount to buildDiagnosticReport', () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} persistedCount={14} />
        </TestProviders>
      );

      expect(buildDiagnosticReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ persistedCount: 14 })
      );
    });
  });

  describe('openChat', () => {
    it('calls openChat when the button is clicked', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).toHaveBeenCalledTimes(1);
    });

    it('does not call openChat when agentBuilder.openChat is null', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          agentBuilder: {
            openChat: null,
          },
          telemetry: {
            reportEvent: mockReportEvent,
          },
        },
      });

      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).not.toHaveBeenCalled();
    });

    it('passes the correct agentId', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: THREAT_HUNTING_AGENT_ID,
        })
      );
    });

    it('passes autoSendInitialMessage as false', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSendInitialMessage: false,
        })
      );
    });

    it('passes sessionTag as security', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTag: 'security',
        })
      );
    });

    it('passes newConversation as true', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({
          newConversation: true,
        })
      );
    });

    it('passes an initial message', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessage: i18n.INITIAL_MESSAGE,
        })
      );
    });

    it('reports a TroubleshootWithAiClicked telemetry event when clicked', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockReportEvent).toHaveBeenCalledWith(
        AttackDiscoveryEventTypes.TroubleshootWithAiClicked,
        {}
      );
    });

    it('does not report telemetry when agentBuilder.openChat is null', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          agentBuilder: {
            openChat: null,
          },
          telemetry: {
            reportEvent: mockReportEvent,
          },
        },
      });

      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      expect(mockReportEvent).not.toHaveBeenCalled();
    });

    it('passes one attachment', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      const call = mockOpenChat.mock.calls[0][0];

      expect(call.attachments).toHaveLength(1);
    });

    it('passes the attachment as a Markdown diagnostic report', async () => {
      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      const call = mockOpenChat.mock.calls[0][0];

      expect(call.attachments[0].type).toBe(DIAGNOSTIC_REPORT_ATTACHMENT_TYPE);
      expect(call.attachments[0].data.content).toContain('# Attack Discovery Diagnostic Report');
    });

    it('includes environment context in the Markdown diagnostic report when provided', async () => {
      const environmentContext = { kibanaVersion: '9.0.0', spaceId: 'default' };

      render(
        <TestProviders>
          <TroubleshootWithAi {...defaultProps} environmentContext={environmentContext} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('troubleshootWithAiButton'));

      const call = mockOpenChat.mock.calls[0][0];
      const markdownContent = call.attachments[0].data.content;

      expect(markdownContent).toContain('9.0.0');
      expect(markdownContent).toContain('default');
    });
  });
});
