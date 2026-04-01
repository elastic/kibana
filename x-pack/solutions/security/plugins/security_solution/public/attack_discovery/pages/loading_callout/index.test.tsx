/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { LoadingCallout } from '.';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('@kbn/react-kibana-context-theme', () => ({
  useKibanaIsDarkMode: jest.fn(() => false),
}));

jest.mock('../use_dismiss_attack_discovery_generations', () => ({
  useDismissAttackDiscoveryGeneration: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}));

jest.mock('./workflow_execution_details_flyout', () => ({
  WorkflowExecutionDetailsFlyout: jest.fn(() => (
    <div data-test-subj="workflowExecutionDetailsFlyout" />
  )),
}));

jest.mock('../../../common/lib/kibana');

describe('LoadingCallout', () => {
  const defaultProps = {
    alertsContextCount: 30,
    approximateFutureTime: new Date(),
    localStorageAttackDiscoveryMaxAlerts: '50',
  };

  const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useKibana with featureFlags
    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
        },
        http: {},
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders the animated loading icon', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const loadingElastic = screen.getByTestId('loadingElastic');

    expect(loadingElastic).toBeInTheDocument();
  });

  it('renders loading messages with the expected count', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const aisCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aisCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 30 alerts in the last 24 hours to generate discoveries.'
    );
  });

  it('renders the countdown', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );
    const countdown = screen.getByTestId('countdown');

    expect(countdown).toBeInTheDocument();
  });

  it('renders a terminal state icon for succeeded', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} status="succeeded" executionUuid="uuid-123" />
      </TestProviders>
    );
    const icon = screen
      .getByTestId('loadingCallout')
      .querySelector('[data-euiicon-type="logoElastic"]');

    expect(icon).not.toBeNull();
  });

  it('renders terminal state icon for failed', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} status="failed" executionUuid="uuid-123" />
      </TestProviders>
    );
    const icon = screen
      .getByTestId('loadingCallout')
      .querySelector('[data-euiicon-type="logoElastic"]');

    expect(icon).not.toBeNull();
  });

  it('renders the Details button when workflowRunId and workflowId are provided and feature flag is enabled', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
        http: {},
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} workflowId="workflow-123" workflowRunId="run-456" />
      </TestProviders>
    );

    await waitFor(() => {
      const detailsButton = screen.getByTestId('detailsButton');
      expect(detailsButton).toBeInTheDocument();
    });
  });

  it('does not render the Details button when workflowRunId is undefined', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} workflowId="workflow-123" workflowRunId={undefined} />
      </TestProviders>
    );

    const detailsButton = screen.queryByTestId('detailsButton');

    expect(detailsButton).not.toBeInTheDocument();
  });

  it('does not render the Details button when workflowId is undefined', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} workflowId={undefined} workflowRunId="run-456" />
      </TestProviders>
    );

    const detailsButton = screen.queryByTestId('detailsButton');

    expect(detailsButton).not.toBeInTheDocument();
  });

  it('does not render the Details button when both workflowRunId and workflowId are undefined', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const detailsButton = screen.queryByTestId('detailsButton');

    expect(detailsButton).not.toBeInTheDocument();
  });

  it('opens the flyout when the Details button is clicked', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
        http: {},
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} workflowId="workflow-123" workflowRunId="run-456" />
      </TestProviders>
    );

    await waitFor(() => {
      const detailsButton = screen.getByTestId('detailsButton');
      expect(detailsButton).toBeInTheDocument();
    });

    const detailsButton = screen.getByTestId('detailsButton');
    await userEvent.click(detailsButton);

    const flyout = screen.getByTestId('workflowExecutionDetailsFlyout');

    expect(flyout).toBeInTheDocument();
  });

  it('does not render the flyout initially', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} workflowId="workflow-123" workflowRunId="run-456" />
      </TestProviders>
    );

    const flyout = screen.queryByTestId('workflowExecutionDetailsFlyout');

    expect(flyout).not.toBeInTheDocument();
  });

  describe('hideActions prop', () => {
    it('renders the dismiss button by default', () => {
      render(
        <TestProviders>
          <LoadingCallout {...defaultProps} />
        </TestProviders>
      );

      const dismissButton = screen.getByTestId('dismissButton');

      expect(dismissButton).toBeInTheDocument();
    });

    it('does not render the dismiss button when hideActions is true', () => {
      render(
        <TestProviders>
          <LoadingCallout {...defaultProps} hideActions />
        </TestProviders>
      );

      const dismissButton = screen.queryByTestId('dismissButton');

      expect(dismissButton).not.toBeInTheDocument();
    });

    it('does not render the Details button when hideActions is true even when feature flag is enabled', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(true),
          },
          http: {},
        },
      } as unknown as ReturnType<typeof useKibana>);

      render(
        <TestProviders>
          <LoadingCallout
            {...defaultProps}
            hideActions
            workflowId="workflow-123"
            workflowRunId="run-456"
          />
        </TestProviders>
      );

      // Wait for the feature flag async call to resolve
      await waitFor(() => {
        expect(mockUseKibana().services.featureFlags.getBooleanValue).toHaveBeenCalled();
      });

      const detailsButton = screen.queryByTestId('detailsButton');

      expect(detailsButton).not.toBeInTheDocument();
    });
  });

  describe('feature flag gating', () => {
    it('does not render the Details button when feature flag is disabled', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(false),
          },
          http: {},
          telemetry: { reportEvent: jest.fn() },
        },
      } as unknown as ReturnType<typeof useKibana>);

      render(
        <TestProviders>
          <LoadingCallout {...defaultProps} workflowId="workflow-123" workflowRunId="run-456" />
        </TestProviders>
      );

      await waitFor(() => {
        const detailsButton = screen.queryByTestId('detailsButton');
        expect(detailsButton).not.toBeInTheDocument();
      });
    });

    it('renders the Details button when feature flag is enabled and workflow IDs are present', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(true),
          },
          http: {},
        },
      } as unknown as ReturnType<typeof useKibana>);

      render(
        <TestProviders>
          <LoadingCallout {...defaultProps} workflowId="workflow-123" workflowRunId="run-456" />
        </TestProviders>
      );

      await waitFor(() => {
        const detailsButton = screen.getByTestId('detailsButton');
        expect(detailsButton).toBeInTheDocument();
      });
    });

    it('does not render the Details button when feature flag is enabled but workflow IDs are missing', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(true),
          },
          http: {},
        },
      } as unknown as ReturnType<typeof useKibana>);

      render(
        <TestProviders>
          <LoadingCallout {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        const detailsButton = screen.queryByTestId('detailsButton');
        expect(detailsButton).not.toBeInTheDocument();
      });
    });
  });
});
