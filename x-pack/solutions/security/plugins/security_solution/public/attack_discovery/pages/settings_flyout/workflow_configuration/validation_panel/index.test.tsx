/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { ValidationPanel } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { useListWorkflows } from '../hooks/use_list_workflows';
import type { WorkflowItem } from '../types';
import * as i18n from '../translations';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../use_workflow_editor_link');
jest.mock('../hooks/use_list_workflows');

const MOCK_WORKFLOWS_APP_URL = '/app/workflows';

/** The real UUID that the validation workflow gets after registration. */
const REAL_VALIDATION_WORKFLOW_ID = 'workflow-real-validation-uuid';

const mockWorkflows: WorkflowItem[] = [
  {
    description: 'Validates generated attack discoveries to the Elasticsearch index',
    id: REAL_VALIDATION_WORKFLOW_ID,
    name: 'Attack Discovery - Default Validation',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:validate'],
  },
  {
    description: 'Custom validation workflow',
    id: 'validation-custom',
    name: 'My Custom Validation',
  },
];

const mockWorkflowsWithAllPredefined: WorkflowItem[] = [
  {
    description: 'Default alert retrieval',
    id: 'default-alert-retrieval-id',
    name: 'Attack discovery - Default alert retrieval',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:default_alert_retrieval'],
  },
  {
    description: 'Generation workflow',
    id: 'generation-id',
    name: 'Attack discovery - Generation',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:generation'],
  },
  {
    description: 'Validates generated attack discoveries',
    id: REAL_VALIDATION_WORKFLOW_ID,
    name: 'Attack Discovery - Default Validation',
    tags: ['Attack discovery', 'Security', 'attackDiscovery:validate'],
  },
  {
    description: 'ES|QL example',
    id: 'esql-example-id',
    name: 'Attack discovery - ES|QL example',
    tags: [
      'Attack discovery',
      'Security',
      'Example',
      'attackDiscovery:esql_example_alert_retrieval',
    ],
  },
  {
    description: 'Custom validation workflow',
    id: 'validation-custom',
    name: 'My Custom Validation',
  },
];

const defaultProps = {
  onChange: jest.fn(),
  value: 'default',
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseListWorkflows = useListWorkflows as jest.MockedFunction<typeof useListWorkflows>;
const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const mockSuccessResult = (data: WorkflowItem[]): ReturnType<typeof useListWorkflows> =>
  ({
    data,
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
  } as ReturnType<typeof useListWorkflows>);

const mockLoadingResult = (): ReturnType<typeof useListWorkflows> =>
  ({
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
  } as ReturnType<typeof useListWorkflows>);

describe('ValidationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: jest.fn().mockReturnValue(MOCK_WORKFLOWS_APP_URL),
        },
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseListWorkflows.mockReturnValue(mockSuccessResult(mockWorkflows));

    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: REAL_VALIDATION_WORKFLOW_ID,
    });
  });

  it('renders validation workflow picker', () => {
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('validationWorkflowPicker')).toBeInTheDocument();
  });

  it('renders validation workflow label and help text', () => {
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.VALIDATION_WORKFLOW_LABEL)).toBeInTheDocument();
    expect(screen.getByText(i18n.VALIDATION_WORKFLOW_HELP)).toBeInTheDocument();
  });

  it('calls onChange when validation workflow is selected', async () => {
    const onChange = jest.fn();
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} onChange={onChange} value="" />
      </TestProviders>
    );

    // Open the dropdown by clicking the super select control
    fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

    await waitFor(
      () => {
        expect(screen.getByText('My Custom Validation')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const option = screen.getByText('My Custom Validation');
    fireEvent.click(option);

    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith('validation-custom');
      },
      { timeout: 3000 }
    );
  });

  describe('when the real validation workflow is in the list', () => {
    it('does NOT render the artificial default entry', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText('Attack Discovery - Default Validation')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(
        screen.queryByText(i18n.DEFAULT_VALIDATION_WORKFLOW_DESCRIPTION)
      ).not.toBeInTheDocument();
    });

    it('shows the real validation workflow as selected when value is "default"', () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="default" />
        </TestProviders>
      );

      expect(screen.getByTestId('validationWorkflowPicker')).toHaveTextContent(
        'Attack Discovery - Default Validation'
      );
    });

    it('renders a Default badge on the real validation workflow when selected', () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="default" />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultBadge')).toBeInTheDocument();
      expect(screen.getByTestId('defaultBadge')).toHaveTextContent(i18n.DEFAULT_BADGE);
    });

    it('renders a Default badge on the real validation workflow in the dropdown', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByTestId('defaultBadgeDropdown')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('does NOT render a Default badge for non-default workflows', () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="validation-custom" />
        </TestProviders>
      );

      expect(screen.queryByTestId('defaultBadge')).not.toBeInTheDocument();
    });
  });

  describe('when the real validation workflow has NOT been registered yet', () => {
    beforeEach(() => {
      mockUseWorkflowEditorLink.mockReturnValue({
        editorUrl: null,
        navigateToEditor: jest.fn(),
        resolvedWorkflowId: null,
      });

      mockUseListWorkflows.mockReturnValue(mockSuccessResult([]));
    });

    it('renders the fallback artificial default entry', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText(i18n.DEFAULT_VALIDATION_WORKFLOW_LABEL)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('shows the fallback entry as selected when value is "default"', () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="default" />
        </TestProviders>
      );

      expect(screen.getByTestId('validationWorkflowPicker')).toHaveTextContent(
        i18n.DEFAULT_VALIDATION_WORKFLOW_LABEL
      );
    });
  });

  it('renders selected validation workflow', () => {
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} value="validation-custom" />
      </TestProviders>
    );

    expect(screen.getByTestId('validationWorkflowPicker')).toHaveTextContent(
      'My Custom Validation'
    );
  });

  it('does NOT render a clear selection button', () => {
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} value="validation-custom" />
      </TestProviders>
    );

    expect(screen.queryByTestId('validationWorkflowPickerClearSelection')).not.toBeInTheDocument();
  });

  it('shows loading state when workflows are loading', () => {
    mockUseListWorkflows.mockReturnValue(mockLoadingResult());

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does NOT show the no-workflows empty state while loading', () => {
    mockUseListWorkflows.mockReturnValue(mockLoadingResult());

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('noWorkflowsAvailable')).not.toBeInTheDocument();
  });

  it('shows the no-workflows empty state when no custom workflows are available', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    mockUseListWorkflows.mockReturnValue(mockSuccessResult([]));

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('noWorkflowsAvailable')).toBeInTheDocument();
  });

  it('still renders the picker with the default workflow when no custom workflows are available', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    mockUseListWorkflows.mockReturnValue(mockSuccessResult([]));

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('validationWorkflowPicker')).toBeInTheDocument();
  });

  it('does NOT show the no-workflows empty state when custom workflows are available', () => {
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('noWorkflowsAvailable')).not.toBeInTheDocument();
  });

  it('passes the agent builder URL to the NoWorkflowsAvailable component', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    mockUseListWorkflows.mockReturnValue(mockSuccessResult([]));

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    const link = screen.getByText(i18n.CREATE_A_WORKFLOW_LINK_LABEL);
    expect(link.closest('a')).toHaveAttribute('href', MOCK_WORKFLOWS_APP_URL);
  });

  it('calls getUrlForApp with the workflows app ID', () => {
    const mockGetUrlForApp = jest.fn().mockReturnValue(MOCK_WORKFLOWS_APP_URL);

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: mockGetUrlForApp,
        },
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows');
  });

  it('renders the create new workflow link with the correct href', () => {
    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    const link = screen.getByTestId('createNewValidationWorkflow');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `${MOCK_WORKFLOWS_APP_URL}/create`);
  });

  it('does NOT render the create new workflow link when getUrlForApp throws', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: jest.fn().mockImplementation(() => {
            throw new Error('App not found');
          }),
        },
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('createNewValidationWorkflow')).not.toBeInTheDocument();
  });

  it('renders an empty agent builder URL when getUrlForApp throws', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: jest.fn().mockImplementation(() => {
            throw new Error('App not found');
          }),
        },
        telemetry: { reportEvent: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    mockUseListWorkflows.mockReturnValue(mockSuccessResult([]));

    render(
      <TestProviders>
        <ValidationPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('noWorkflowsAvailable')).toBeInTheDocument();
    expect(screen.queryByText(i18n.CREATE_A_WORKFLOW_LINK_LABEL)).not.toBeInTheDocument();
  });

  describe('workflow filtering', () => {
    beforeEach(() => {
      mockUseListWorkflows.mockReturnValue(mockSuccessResult(mockWorkflowsWithAllPredefined));
    });

    it('excludes the default alert retrieval workflow from the picker', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText('Attack Discovery - Default Validation')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(
        screen.queryByText('Attack discovery - Default alert retrieval')
      ).not.toBeInTheDocument();
    });

    it('excludes the generation workflow from the picker', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText('Attack Discovery - Default Validation')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.queryByText('Attack discovery - Generation')).not.toBeInTheDocument();
    });

    it('excludes the ES|QL example alert retrieval workflow from the picker', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText('Attack Discovery - Default Validation')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.queryByText('Attack discovery - ES|QL example')).not.toBeInTheDocument();
    });

    it('includes the default validation workflow', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText('Attack Discovery - Default Validation')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('includes custom (user-created) workflows without AD tags', async () => {
      render(
        <TestProviders>
          <ValidationPanel {...defaultProps} value="" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('validationWorkflowPicker'));

      await waitFor(
        () => {
          expect(screen.getByText('My Custom Validation')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
