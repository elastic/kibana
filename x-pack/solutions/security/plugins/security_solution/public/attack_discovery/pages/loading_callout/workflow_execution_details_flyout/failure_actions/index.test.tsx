/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';

import { TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import type { AggregatedWorkflowExecution } from '../../types';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { classifyFailure } from './helpers/classify_failure';
import { FailureActions } from '.';

jest.mock('./helpers/classify_failure', () => ({
  classifyFailure: jest.fn(),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../use_workflow_editor_link', () => ({
  useWorkflowEditorLink: jest.fn(),
}));

const mockClassifyFailure = classifyFailure as jest.Mock;
const mockGetUrlForApp = jest.fn();
const mockUseKibana = useKibana as jest.Mock;
const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const { classifyFailure: realClassifyFailure } = jest.requireActual('./helpers/classify_failure');

const defaultAggregatedExecution: AggregatedWorkflowExecution = {
  status: ExecutionStatus.FAILED,
  steps: [],
  workflowExecutions: null,
};

const defaultEditorUrl = 'http://localhost:5601/app/workflows/workflow-123';

beforeEach(() => {
  jest.clearAllMocks();

  // Default: delegate to the real implementation.
  mockClassifyFailure.mockImplementation(realClassifyFailure);

  mockUseKibana.mockReturnValue({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
    },
  });

  mockGetUrlForApp.mockImplementation((appId: string, options?: { path?: string }) => {
    return `http://localhost:5601/app/${appId}${options?.path ?? ''}`;
  });

  mockUseWorkflowEditorLink.mockReturnValue({
    editorUrl: defaultEditorUrl,
    navigateToEditor: jest.fn(),
    resolvedWorkflowId: 'workflow-123',
  });
});

describe('FailureActions', () => {
  describe('non-actionable categories', () => {
    it('renders nothing for rate_limit failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="429 rate limit exceeded"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for network_error failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="ECONNREFUSED connection refused"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for permission_error failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions aggregatedExecution={defaultAggregatedExecution} reason="403 forbidden" />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for concurrent_conflict failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="409 version_conflict"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for cluster_health failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="no_shard_available_action_exception"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for unknown failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="something completely unexpected happened"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for validation_error failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="validation failed: missing required field"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for anonymization_error failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="anonymization replacement failed"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for step_registration_error failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="step type not registered: custom.step"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for workflow_error failures', () => {
      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="workflow execution failed unexpectedly"
          />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('workflow_disabled category', () => {
    it('renders the callout', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-123' is not enabled"
            workflowId="workflow-123"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
    });

    it('renders the summary sentence', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-123' is not enabled"
            workflowId="workflow-123"
          />
        </TestProviders>
      );

      expect(
        screen.getByText('A configured workflow is disabled. Enable it, then retry generation.')
      ).toBeInTheDocument();
    });

    it('renders the workflow_editor action link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-123' is not enabled"
            workflowId="workflow-123"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('failureAction-workflow_editor')).toBeInTheDocument();
    });

    it('uses editorUrl from useWorkflowEditorLink for the workflow editor link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-123' is not enabled"
            workflowId="workflow-123"
          />
        </TestProviders>
      );

      const link = screen.getByTestId('failureAction-workflow_editor');

      expect(link).toHaveAttribute('href', defaultEditorUrl);
    });

    it('passes the workflowId extracted from the reason to useWorkflowEditorLink', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'wf-from-reason' is not enabled"
          />
        </TestProviders>
      );

      expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'wf-from-reason' })
      );
    });

    it('falls back to the workflowId prop when the reason contains no workflow id', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="workflow is disabled"
            workflowId="prop-workflow-id"
          />
        </TestProviders>
      );

      expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'prop-workflow-id' })
      );
    });

    it('renders nothing when editorUrl is null', () => {
      mockUseWorkflowEditorLink.mockReturnValue({
        editorUrl: null,
        navigateToEditor: jest.fn(),
        resolvedWorkflowId: null,
      });

      const { container } = render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-123' is not enabled"
          />
        </TestProviders>
      );

      // Callout renders (has actions) but the link itself is absent
      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="failureAction-workflow_editor"]')
      ).toBeNull();
    });
  });

  describe('workflow_invalid category', () => {
    it('renders the callout with workflow editor link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-abc' is not valid"
            workflowId="workflow-abc"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(screen.getByTestId('failureAction-workflow_editor')).toBeInTheDocument();
    });

    it('renders the summary sentence for workflow_invalid', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="Workflow 'workflow-abc' is not valid"
          />
        </TestProviders>
      );

      expect(
        screen.getByText(
          'A configured workflow has an invalid configuration. Edit the YAML to fix it.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('timeout category', () => {
    it('renders the callout with workflow editor link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="execution timed out after 300 seconds"
            workflowId="workflow-timeout"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(screen.getByTestId('failureAction-workflow_editor')).toBeInTheDocument();
    });

    it('renders the summary sentence for timeout', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="execution timed out"
          />
        </TestProviders>
      );

      expect(screen.getByText('The workflow timed out before completing.')).toBeInTheDocument();
    });
  });

  describe('connector_error category', () => {
    it('renders the callout with connector_management link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="connector error: invalid API key"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(screen.getByTestId('failureAction-connector_management')).toBeInTheDocument();
    });

    it('uses application.getUrlForApp for the connector management link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="connector error: invalid API key"
          />
        </TestProviders>
      );

      const link = screen.getByTestId('failureAction-connector_management');

      expect(link).toHaveAttribute(
        'href',
        'http://localhost:5601/app/management/insightsAndAlerting/triggersActionsConnectors/connectors'
      );
    });

    it('renders the summary sentence for connector_error', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="connector error: request failed"
          />
        </TestProviders>
      );

      expect(
        screen.getByText('A connector error prevented generation from completing.')
      ).toBeInTheDocument();
    });
  });

  describe('workflow_deleted category', () => {
    it('renders the callout with attack_discovery_settings link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="workflow not found: workflow-deleted-123"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(screen.getByTestId('failureAction-attack_discovery_settings')).toBeInTheDocument();
    });

    it('uses application.getUrlForApp for the attack discovery settings link', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="workflow not found: workflow-deleted-123"
          />
        </TestProviders>
      );

      expect(mockGetUrlForApp).toHaveBeenCalledWith(
        'securitySolution',
        expect.objectContaining({ path: '/attack_discovery' })
      );
    });

    it('renders the summary sentence for workflow_deleted', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="workflow not found: workflow-deleted-123"
          />
        </TestProviders>
      );

      expect(
        screen.getByText('A configured workflow was deleted or cannot be found.')
      ).toBeInTheDocument();
    });

    it('renders nothing when getUrlForApp throws for attack_discovery_settings', () => {
      mockGetUrlForApp.mockImplementation(() => {
        throw new Error('App not found');
      });

      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="workflow not found: workflow-deleted-123"
          />
        </TestProviders>
      );

      // Callout renders but link is absent
      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(
        screen.queryByTestId('failureAction-attack_discovery_settings')
      ).not.toBeInTheDocument();
    });
  });

  describe('callout color', () => {
    it('renders EuiCallOut with warning color', () => {
      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="connector error: request failed"
          />
        </TestProviders>
      );

      // EuiCallOut with color="warning" adds a CSS class containing "warning"
      const callout = screen.getByTestId('failureActionsCallout');

      expect(callout.className).toMatch(/warning/);
    });
  });

  describe('edge cases', () => {
    it('renders nothing for a connector_management action when getUrlForApp throws', () => {
      mockGetUrlForApp.mockImplementation(() => {
        throw new Error('App not found');
      });

      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="connector error: invalid API key"
          />
        </TestProviders>
      );

      // Callout renders (has actions) but the link itself is absent
      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('failureAction-connector_management')).not.toBeInTheDocument();
    });

    it('omits href for unknown link types (external / none)', () => {
      mockClassifyFailure.mockReturnValue({
        actions: [{ label: 'Some action', linkType: 'none' }],
        category: 'unknown',
        summary: 'An unexpected error occurred.',
      });

      render(
        <TestProviders>
          <FailureActions
            aggregatedExecution={defaultAggregatedExecution}
            reason="unknown reason"
          />
        </TestProviders>
      );

      // Callout renders but no link is rendered (default case → href = null)
      expect(screen.getByTestId('failureActionsCallout')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
