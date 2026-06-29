/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { WorkflowConfigurationPanel } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { useListWorkflows } from '../hooks/use_list_workflows';
import type { WorkflowConfiguration, WorkflowItem } from '../types';
import * as i18n from '../translations';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../hooks/use_list_workflows');

const MOCK_WORKFLOWS_URL = '/app/workflows';
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const mockWorkflows: WorkflowItem[] = [
  {
    description: 'Alert retrieval workflow 1',
    id: 'alert-retrieval-1',
    name: 'Alert Retrieval Workflow 1',
  },
  {
    description: 'Alert retrieval workflow 2',
    id: 'alert-retrieval-2',
    name: 'Alert Retrieval Workflow 2',
  },
  {
    description: 'Validation workflow 1',
    id: 'validation-1',
    name: 'Validation Workflow 1',
  },
];

const mockWorkflowsWithPredefined: WorkflowItem[] = [
  {
    description: 'Custom alert retrieval workflow',
    id: 'custom-retrieval',
    name: 'My Custom Retrieval',
  },
  {
    description: 'Default alert retrieval',
    id: 'system-attack-discovery-alert-retrieval',
    managed: true,
    name: 'Attack discovery - Default alert retrieval',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:default_alert_retrieval'],
  },
  {
    description: 'Generation workflow',
    id: 'system-attack-discovery-generation',
    managed: true,
    name: 'Attack discovery - Generation',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:generation'],
  },
  {
    description: 'Default validation',
    id: 'system-attack-discovery-validate',
    managed: true,
    name: 'Attack discovery - Default validation',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:validate'],
  },
  {
    description: 'Orchestrates KI feature identification',
    id: 'system-streams-ki-onboarding',
    managed: true,
    name: '.streams-ki-onboarding',
    tags: ['Streams'],
  },
];

const defaultConfig: WorkflowConfiguration = {
  alertRetrievalMode: 'custom_query',
  alertRetrievalWorkflowIds: [],
  alertRetrievalWorkflowsEnabled: false,
  defaultRetrievalEnabled: false,
  skillEnabled: true,
  validationWorkflowId: 'default',
};

const defaultProps = {
  connectorId: 'test-connector-id',
  onChange: jest.fn(),
  value: defaultConfig,
};

const mockUseListWorkflows = useListWorkflows as jest.MockedFunction<typeof useListWorkflows>;

const mockSuccessResult = {
  data: mockWorkflows,
  dataUpdatedAt: Date.now(),
  error: null,
  errorUpdateCount: 0,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  fetchStatus: 'idle' as const,
  isError: false,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isInitialLoading: false,
  isLoading: false,
  isLoadingError: false,
  isPaused: false,
  isPending: false,
  isPlaceholderData: false,
  isPreviousData: false,
  isRefetchError: false,
  isRefetching: false,
  isStale: false,
  isSuccess: true,
  refetch: jest.fn(),
  remove: jest.fn(),
  status: 'success' as const,
} as ReturnType<typeof useListWorkflows>;

const mockLoadingResult = {
  data: undefined,
  dataUpdatedAt: 0,
  error: null,
  errorUpdateCount: 0,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  fetchStatus: 'fetching' as const,
  isError: false,
  isFetched: false,
  isFetchedAfterMount: false,
  isFetching: true,
  isInitialLoading: true,
  isLoading: true,
  isLoadingError: false,
  isPaused: false,
  isPending: false,
  isPlaceholderData: false,
  isPreviousData: false,
  isRefetchError: false,
  isRefetching: false,
  isStale: false,
  isSuccess: false,
  refetch: jest.fn(),
  remove: jest.fn(),
  status: 'loading' as const,
} as ReturnType<typeof useListWorkflows>;

const mockEmptyResult = {
  ...mockSuccessResult,
  data: [],
} as ReturnType<typeof useListWorkflows>;

// EuiComboBox no longer sets a `title` attribute on rendered options, so locate
// an option by the text content it renders (name + optional description).
const findOptionByName = (name: string): HTMLElement | null =>
  screen.queryAllByRole('option').find((option) => option.textContent?.includes(name)) ?? null;

describe('WorkflowConfigurationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: jest.fn().mockReturnValue(MOCK_WORKFLOWS_URL),
        },
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseListWorkflows.mockReturnValue(mockSuccessResult);
  });

  it('renders alert retrieval workflow picker', () => {
    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertRetrievalWorkflowPicker')).toBeInTheDocument();
  });

  it('renders alert retrieval workflows label and help text', () => {
    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.ALERT_RETRIEVAL_WORKFLOWS_LABEL)).toBeInTheDocument();
    expect(screen.getByText(i18n.ALERT_RETRIEVAL_WORKFLOWS_HELP)).toBeInTheDocument();
  });

  it('calls onChange when alert retrieval workflow is selected', async () => {
    const onChange = jest.fn();
    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} onChange={onChange} />
      </TestProviders>
    );

    const alertRetrievalInput = screen.getByRole('combobox');
    alertRetrievalInput.focus();
    await userEvent.type(alertRetrievalInput, 'Alert R');

    await waitFor(() => {
      expect(findOptionByName('Alert Retrieval Workflow 1')).toBeInTheDocument();
    });

    const option = findOptionByName('Alert Retrieval Workflow 1');
    if (option == null) {
      throw new Error('Expected to find the "Alert Retrieval Workflow 1" option');
    }
    fireEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        ...defaultConfig,
        alertRetrievalWorkflowIds: ['alert-retrieval-1'],
      });
    });
  });

  it('renders selected alert retrieval workflow', () => {
    const configWithSelection: WorkflowConfiguration = {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: ['alert-retrieval-1'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: false,
      skillEnabled: true,
      validationWorkflowId: 'default',
    };

    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} value={configWithSelection} />
      </TestProviders>
    );

    expect(screen.getByText('Alert Retrieval Workflow 1')).toBeInTheDocument();
  });

  it('renders multiple selected alert retrieval workflows', () => {
    const configWithMultipleSelections: WorkflowConfiguration = {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: ['alert-retrieval-1', 'alert-retrieval-2'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: false,
      skillEnabled: true,
      validationWorkflowId: 'default',
    };

    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} value={configWithMultipleSelections} />
      </TestProviders>
    );

    expect(screen.getByText('Alert Retrieval Workflow 1')).toBeInTheDocument();
    expect(screen.getByText('Alert Retrieval Workflow 2')).toBeInTheDocument();
  });

  it('shows loading state when workflows are loading', () => {
    mockUseListWorkflows.mockReturnValue(mockLoadingResult);

    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} />
      </TestProviders>
    );

    const pickers = screen.getAllByRole('progressbar');
    expect(pickers.length).toBeGreaterThan(0);
  });

  it('renders the no-workflows empty state when workflows list is empty', () => {
    mockUseListWorkflows.mockReturnValue(mockEmptyResult);

    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('noWorkflowsAvailable')).toBeInTheDocument();
    expect(screen.getByText(i18n.NO_CUSTOM_WORKFLOWS_AVAILABLE_MESSAGE)).toBeInTheDocument();
  });

  it('does NOT render the no-workflows empty state when workflows are available', () => {
    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('noWorkflowsAvailable')).not.toBeInTheDocument();
  });

  it('does NOT render the no-workflows empty state while loading', () => {
    mockUseListWorkflows.mockReturnValue(mockLoadingResult);

    render(
      <TestProviders>
        <WorkflowConfigurationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('noWorkflowsAvailable')).not.toBeInTheDocument();
  });

  describe('dynamic label with count', () => {
    it('renders label WITHOUT count when zero workflows are selected', () => {
      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText(i18n.ALERT_RETRIEVAL_WORKFLOWS_LABEL)).toBeInTheDocument();
    });

    it('renders label WITH count of 1 when exactly one workflow is selected', () => {
      const configWithOne: WorkflowConfiguration = {
        alertRetrievalMode: 'custom_query',
        alertRetrievalWorkflowIds: ['alert-retrieval-1'],
        alertRetrievalWorkflowsEnabled: true,
        defaultRetrievalEnabled: false,
        skillEnabled: true,
        validationWorkflowId: 'default',
      };

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} value={configWithOne} />
        </TestProviders>
      );

      expect(screen.getByText(i18n.getAlertRetrievalWorkflowsLabel(1))).toBeInTheDocument();
    });

    it('renders label WITH count when more than one workflow is selected', () => {
      const configWithTwo: WorkflowConfiguration = {
        alertRetrievalMode: 'custom_query',
        alertRetrievalWorkflowIds: ['alert-retrieval-1', 'alert-retrieval-2'],
        alertRetrievalWorkflowsEnabled: true,
        defaultRetrievalEnabled: false,
        skillEnabled: true,
        validationWorkflowId: 'default',
      };

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} value={configWithTwo} />
        </TestProviders>
      );

      expect(screen.getByText(i18n.getAlertRetrievalWorkflowsLabel(2))).toBeInTheDocument();
    });

    it('renders label WITH count of 3 when three workflows are selected', () => {
      const configWithThree: WorkflowConfiguration = {
        alertRetrievalMode: 'custom_query',
        alertRetrievalWorkflowIds: ['alert-retrieval-1', 'alert-retrieval-2', 'validation-1'],
        alertRetrievalWorkflowsEnabled: true,
        defaultRetrievalEnabled: false,
        skillEnabled: true,
        validationWorkflowId: 'default',
      };

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} value={configWithThree} />
        </TestProviders>
      );

      expect(screen.getByText(i18n.getAlertRetrievalWorkflowsLabel(3))).toBeInTheDocument();
    });
  });

  describe('workflow filtering', () => {
    const mockSuccessWithPredefined = {
      ...mockSuccessResult,
      data: mockWorkflowsWithPredefined,
    } as ReturnType<typeof useListWorkflows>;

    it('excludes the default alert retrieval workflow from the picker', async () => {
      mockUseListWorkflows.mockReturnValue(mockSuccessWithPredefined);

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'My');

      await waitFor(() => {
        expect(findOptionByName('My Custom Retrieval')).toBeInTheDocument();
      });

      expect(
        findOptionByName('Attack discovery - Default alert retrieval')
      ).not.toBeInTheDocument();
    });

    it('excludes the generation workflow from the picker', async () => {
      mockUseListWorkflows.mockReturnValue(mockSuccessWithPredefined);

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'My');

      await waitFor(() => {
        expect(findOptionByName('My Custom Retrieval')).toBeInTheDocument();
      });

      expect(findOptionByName('Attack discovery - Generation')).not.toBeInTheDocument();
    });

    it('excludes the default validation workflow from the picker', async () => {
      mockUseListWorkflows.mockReturnValue(mockSuccessWithPredefined);

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'My');

      await waitFor(() => {
        expect(findOptionByName('My Custom Retrieval')).toBeInTheDocument();
      });

      expect(findOptionByName('Attack discovery - Default validation')).not.toBeInTheDocument();
    });

    it('excludes managed workflows owned by other plugins from the picker', async () => {
      mockUseListWorkflows.mockReturnValue(mockSuccessWithPredefined);

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'My');

      await waitFor(() => {
        expect(findOptionByName('My Custom Retrieval')).toBeInTheDocument();
      });

      expect(findOptionByName('.streams-ki-onboarding')).not.toBeInTheDocument();
    });

    it('includes custom (user-created) workflows without AD tags', async () => {
      mockUseListWorkflows.mockReturnValue(mockSuccessWithPredefined);

      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'My');

      await waitFor(() => {
        expect(findOptionByName('My Custom Retrieval')).toBeInTheDocument();
      });
    });
  });

  describe('Create a new workflow link', () => {
    it('renders the Create a new workflow link', () => {
      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('createNewWorkflow')).toBeInTheDocument();
      expect(screen.getByText(i18n.CREATE_NEW_WORKFLOW)).toBeInTheDocument();
    });

    it('has an href that ends with /create', () => {
      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const link = screen.getByTestId('createNewWorkflow');
      expect(link.getAttribute('href')).toMatch(/\/create$/);
    });

    it('opens in a new tab', () => {
      render(
        <TestProviders>
          <WorkflowConfigurationPanel {...defaultProps} />
        </TestProviders>
      );

      const link = screen.getByTestId('createNewWorkflow');
      expect(link.getAttribute('target')).toBe('_blank');
    });
  });
});
