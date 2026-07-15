/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { useConnectors } from '../../../../../common/hooks/use_connectors';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';

import { EditForm } from './edit_form';

import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { getDefaultQuery } from '../../../helpers';
import type { UseGenerateWorkflowResult } from '../../workflow_configuration/hooks/use_generate_workflow';
import { useGenerateWorkflow } from '../../workflow_configuration/hooks/use_generate_workflow';
import { useListWorkflows } from '../../workflow_configuration/hooks/use_list_workflows';
import { DEFAULT_WORKFLOW_CONFIGURATION } from '../../workflow_configuration';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
  },
];

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/hooks/use_connectors');
jest.mock('../../workflow_configuration/hooks/use_list_workflows');
jest.mock('../../workflow_configuration/hooks/use_generate_workflow');
jest.mock('../../../use_workflow_editor_link', () => ({
  useWorkflowEditorLink: jest.fn().mockReturnValue({
    editorUrl: null,
    navigateToEditor: jest.fn(),
    resolvedWorkflowId: null,
  }),
}));
jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));
jest.mock('../../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn().mockReturnValue({
    dataView: undefined,
    status: 'ready',
  }),
}));
jest.mock('../../workflow_settings_view/alert_retrieval_step/alert_retrieval_content', () => ({
  AlertRetrievalContent: ({
    alertRetrievalHasError,
    connectorId,
    workflowConfiguration,
  }: {
    alertRetrievalHasError: boolean;
    connectorId: string | undefined;
    workflowConfiguration: { alertRetrievalMode: string; esqlQuery?: string };
  }) => (
    <div
      data-test-subj="alertRetrievalContent"
      data-alert-retrieval-has-error={String(alertRetrievalHasError)}
      data-connector-id={connectorId ?? ''}
      data-default-alert-retrieval-mode={workflowConfiguration.alertRetrievalMode}
      data-esql-query={workflowConfiguration.esqlQuery ?? ''}
    />
  ),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const onChangeMock = jest.fn();

const defaultProps = {
  initialValue: {
    name: '',
    alertsSelectionSettings: {
      query: getDefaultQuery(),
      filters: [],
      size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
      start: DEFAULT_START,
      end: DEFAULT_END,
    },
    interval: '4h',
    actions: [],
  },
  onChange: onChangeMock,
};

const renderComponent = async () => {
  await act(() => {
    render(
      <TestProviders>
        <EditForm {...defaultProps} />
      </TestProviders>
    );
  });
};

// Failing: See https://github.com/elastic/kibana/issues/255131
describe.skip('EditForm', () => {
  const mockTriggersActionsUi = triggersActionsUiMock.createStart();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: mockTriggersActionsUi,
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    (useConnectors as jest.Mock).mockReturnValue({
      connectors: mockConnectors,
      setCurrentConnector: jest.fn(),
    });

    (useListWorkflows as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      status: 'success' as const,
    });

    (useGenerateWorkflow as jest.Mock).mockReturnValue({
      cancelGeneration: jest.fn(),
      generatedWorkflow: null,
      isGenerating: false,
      startGeneration: jest.fn(),
    });
  });

  it('should return the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
    });
  });

  it('should return the name input field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryFormNameField')).toBeInTheDocument();
    });
  });

  it('should return the connector selector field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toBeInTheDocument();
    });
  });

  it('should return the alert selection field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
    });
  });

  it('should return the alert selection component with `AlertSelectionQuery` as settings view', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
    });
  });

  it('should return the `run every` field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
    });
  });

  it('should return the actions field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Select a connector type')).toBeInTheDocument();
    });
  });

  it('should invoke `onChange`', async () => {
    await renderComponent();

    expect(onChangeMock).toHaveBeenCalled();
  });

  it('should override default action frequency to `for each alert` instead of `summary of alerts`', async () => {
    mockTriggersActionsUi.getActionForm = jest.fn();

    await renderComponent();

    expect(mockTriggersActionsUi.getActionForm).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultRuleFrequency: {
          notifyWhen: 'onActiveAlert',
          summary: false,
          throttle: null,
        },
      })
    );
  });

  it('calls onFormMutated when settings change', async () => {
    const onFormMutatedMock = jest.fn();

    render(
      <TestProviders>
        <EditForm {...defaultProps} onFormMutated={onFormMutatedMock} />
      </TestProviders>
    );

    const input = screen.getByTestId('alertsRange');
    fireEvent.change(input, { target: { value: 'changed' } });

    expect(onFormMutatedMock).toHaveBeenCalled();
  });

  describe('when isWorkflowsEnabled is false (feature flag OFF)', () => {
    it('does NOT render AlertRetrievalContent', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('alertRetrievalContent')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the alert retrieval step', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('alertRetrievalStep')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the generation step', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('generationStep')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the validation step', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('validationStep')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the default alert retrieval accordion', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('defaultAlertRetrievalAccordion')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the workflow configuration panel', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('alertRetrievalWorkflowPicker')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the validation workflow picker', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('validationWorkflowPicker')).not.toBeInTheDocument();
      });
    });

    it('does NOT render the notifications step', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('notificationsStep')).not.toBeInTheDocument();
      });
    });

    it('renders the alert selection settings directly (not inside a workflow step)', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
      });
    });
  });

  describe('when isWorkflowsEnabled is true', () => {
    const mockUseListWorkflows = useListWorkflows as jest.MockedFunction<typeof useListWorkflows>;
    const mockUseGenerateWorkflow = useGenerateWorkflow as jest.MockedFunction<
      typeof useGenerateWorkflow
    >;

    const defaultGenerateWorkflowResult: UseGenerateWorkflowResult = {
      cancelGeneration: jest.fn(),
      generatedWorkflow: null,
      isGenerating: false,
      startGeneration: jest.fn(),
    };

    const workflowProps = {
      ...defaultProps,
      initialValue: {
        ...defaultProps.initialValue,
        workflowConfig: DEFAULT_WORKFLOW_CONFIGURATION,
      },
      isWorkflowsEnabled: true,
    };

    const renderWorkflowComponent = async () => {
      await act(() => {
        render(
          <TestProviders>
            <EditForm {...workflowProps} />
          </TestProviders>
        );
      });
    };

    beforeEach(() => {
      mockUseListWorkflows.mockReturnValue({
        data: [],
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

      mockUseGenerateWorkflow.mockReturnValue(defaultGenerateWorkflowResult);
    });

    it('renders the alert retrieval step', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertRetrievalStep')).toBeInTheDocument();
      });
    });

    it('renders the generation step', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('generationStep')).toBeInTheDocument();
      });
    });

    it('renders the validation step', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('validationStep')).toBeInTheDocument();
      });
    });

    it('renders AlertRetrievalContent', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertRetrievalContent')).toBeInTheDocument();
      });
    });

    it('passes alertRetrievalHasError=false to AlertRetrievalContent when retrieval methods are configured', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertRetrievalContent')).toHaveAttribute(
          'data-alert-retrieval-has-error',
          'false'
        );
      });
    });

    it('passes the alertRetrievalMode to AlertRetrievalContent', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertRetrievalContent')).toHaveAttribute(
          'data-default-alert-retrieval-mode',
          'esql'
        );
      });
    });

    it('renders the validation workflow picker', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('validationWorkflowPicker')).toBeInTheDocument();
      });
    });

    it('renders the notifications step', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('notificationsStep')).toBeInTheDocument();
      });
    });

    it('does NOT render the validation errors callout when at least one retrieval method is enabled', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertRetrievalStep')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
    });

    it('renders the validation errors callout when no retrieval method is enabled', async () => {
      const noRetrievalWorkflowConfig = {
        ...DEFAULT_WORKFLOW_CONFIGURATION,
        alertRetrievalWorkflowsEnabled: false,
        defaultRetrievalEnabled: false,
        skillEnabled: false,
      };

      await act(() => {
        render(
          <TestProviders>
            <EditForm
              {...defaultProps}
              initialValue={{
                ...defaultProps.initialValue,
                workflowConfig: noRetrievalWorkflowConfig,
              }}
              isWorkflowsEnabled={true}
            />
          </TestProviders>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
      });
    });

    it('populates the form with saved workflow_config values', async () => {
      const savedWorkflowConfig = {
        alertRetrievalMode: 'custom_query' as const,
        alertRetrievalWorkflowIds: ['workflow-1'],
        alertRetrievalWorkflowsEnabled: true,
        defaultRetrievalEnabled: false,
        skillEnabled: true,
        validationWorkflowId: 'custom-validation',
      };

      await act(() => {
        render(
          <TestProviders>
            <EditForm
              {...defaultProps}
              initialValue={{
                ...defaultProps.initialValue,
                workflowConfig: savedWorkflowConfig,
              }}
              isWorkflowsEnabled={true}
            />
          </TestProviders>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('alertRetrievalStep')).toBeInTheDocument();
      });
    });

    it('invokes onChange when rendered with workflow config', async () => {
      await renderWorkflowComponent();

      expect(onChangeMock).toHaveBeenCalled();
    });

    it('still renders the schedule form container', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
      });
    });

    it('still renders the name input field', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryFormNameField')).toBeInTheDocument();
      });
    });

    it('still renders the connector selector field', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toBeInTheDocument();
      });
    });

    it('still renders the schedule field', async () => {
      await renderWorkflowComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
      });
    });

    describe('when editing an existing ES|QL schedule', () => {
      const esqlQuery = 'FROM .alerts-security.alerts-default | WHERE event.kind == "signal"';

      const esqlWorkflowConfig = {
        alertRetrievalMode: 'esql' as const,
        alertRetrievalWorkflowIds: [],
        alertRetrievalWorkflowsEnabled: false,
        defaultRetrievalEnabled: true,
        esqlQuery,
        skillEnabled: true,
        validationWorkflowId: 'default',
      };

      const esqlProps = {
        ...defaultProps,
        initialValue: {
          ...defaultProps.initialValue,
          connectorId: 'test-id',
          name: 'Test ES|QL Schedule',
          workflowConfig: esqlWorkflowConfig,
        },
        isWorkflowsEnabled: true,
      };

      const renderEsqlComponent = async () => {
        await act(() => {
          render(
            <TestProviders>
              <EditForm {...esqlProps} />
            </TestProviders>
          );
        });
      };

      it('passes alertRetrievalMode=esql to AlertRetrievalContent', async () => {
        await renderEsqlComponent();

        await waitFor(() => {
          expect(screen.getByTestId('alertRetrievalContent')).toHaveAttribute(
            'data-default-alert-retrieval-mode',
            'esql'
          );
        });
      });

      it('passes the esqlQuery to AlertRetrievalContent', async () => {
        await renderEsqlComponent();

        await waitFor(() => {
          expect(screen.getByTestId('alertRetrievalContent')).toHaveAttribute(
            'data-esql-query',
            esqlQuery
          );
        });
      });

      it('includes workflowConfig with esql mode in the form submit data', async () => {
        await renderEsqlComponent();

        await waitFor(() => {
          expect(onChangeMock).toHaveBeenCalled();
        });

        let result: { isValid: boolean; data: Record<string, unknown> };
        await act(async () => {
          const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
          result = await lastCall.submit();
        });

        expect(result!.isValid).toBe(true);
        expect(result!.data.workflowConfig).toEqual(esqlWorkflowConfig);
      });
    });
  });
});

describe('EditForm — empty alert retrieval workflows (deferred validation)', () => {
  const mockTriggersActionsUi = triggersActionsUiMock.createStart();
  const mockUseListWorkflows = useListWorkflows as jest.MockedFunction<typeof useListWorkflows>;
  const mockUseGenerateWorkflow = useGenerateWorkflow as jest.MockedFunction<
    typeof useGenerateWorkflow
  >;

  const emptyWorkflowsConfig = {
    alertRetrievalMode: 'custom_query' as const,
    alertRetrievalWorkflowIds: [],
    alertRetrievalWorkflowsEnabled: true,
    defaultRetrievalEnabled: false,
    skillEnabled: false,
    validationWorkflowId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: mockTriggersActionsUi,
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    (useConnectors as jest.Mock).mockReturnValue({
      connectors: mockConnectors,
      setCurrentConnector: jest.fn(),
    });

    mockUseListWorkflows.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      status: 'success' as const,
    } as unknown as ReturnType<typeof useListWorkflows>);

    mockUseGenerateWorkflow.mockReturnValue({
      cancelGeneration: jest.fn(),
      generatedWorkflow: null,
      isGenerating: false,
      startGeneration: jest.fn(),
    } as UseGenerateWorkflowResult);
  });

  const renderWith = async (workflowConfig: Record<string, unknown>) => {
    const onChange = jest.fn();

    await act(() => {
      render(
        <TestProviders>
          <EditForm
            initialValue={{
              ...defaultProps.initialValue,
              connectorId: 'test-id',
              name: 'Test schedule',
              workflowConfig: workflowConfig as never,
            }}
            isWorkflowsEnabled={true}
            onChange={onChange}
          />
        </TestProviders>
      );
    });

    return onChange;
  };

  const latestSubmit = (onChange: jest.Mock) =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0].submit as () => Promise<{
      isValid: boolean;
      data: Record<string, unknown>;
    }>;

  it('blocks submit (isValid=false) when the workflows toggle is the sole source and empty', async () => {
    const onChange = await renderWith(emptyWorkflowsConfig);

    let result: { isValid: boolean; data: Record<string, unknown> } | undefined;
    await act(async () => {
      result = await latestSubmit(onChange)();
    });

    expect(result?.isValid).toBe(false);
  });

  it('allows submit when a workflow is selected', async () => {
    const onChange = await renderWith({
      ...emptyWorkflowsConfig,
      alertRetrievalWorkflowIds: ['workflow-1'],
    });

    let result: { isValid: boolean; data: Record<string, unknown> } | undefined;
    await act(async () => {
      result = await latestSubmit(onChange)();
    });

    expect(result?.isValid).toBe(true);
  });

  it('allows submit when the skill toggle is also enabled', async () => {
    const onChange = await renderWith({ ...emptyWorkflowsConfig, skillEnabled: true });

    let result: { isValid: boolean; data: Record<string, unknown> } | undefined;
    await act(async () => {
      result = await latestSubmit(onChange)();
    });

    expect(result?.isValid).toBe(true);
  });

  it('reveals the validation errors callout after a blocked submit attempt', async () => {
    const onChange = await renderWith(emptyWorkflowsConfig);

    expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();

    await act(async () => {
      await latestSubmit(onChange)();
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowValidationErrorsCallout')).toHaveTextContent(
        'Select at least one alert retrieval workflow'
      );
    });
  });
});
