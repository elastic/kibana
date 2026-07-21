/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import type { UseSettingsView } from './use_settings_view';
import { useSettingsView } from './use_settings_view';
import { TestProviders } from '../../../../common/mock';

const mockFilterManager = createFilterManagerMock();

// Mock EuiSuperDatePicker to capture onTimeChange
const mockOnTimeChange = jest.fn();
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiSuperDatePicker: (props: { onTimeChange: jest.Mock }) => {
    if (props.onTimeChange) {
      mockOnTimeChange.mockImplementation(props.onTimeChange);
    }
    return <div data-test-subj="alertSelectionDatePicker" />;
  },
}));

// Mock for discover-utils UI_SETTINGS in case META_FIELDS is imported from there
jest.mock('@kbn/discover-utils', () => ({
  ...jest.requireActual('@kbn/discover-utils/src/constants'),
  UI_SETTINGS: {
    META_FIELDS: 'metaFields',
    SORT_DEFAULT_ORDER_SETTING: 'discover:sort:defaultOrder',
    DOC_HIDE_TIME_COLUMN_SETTING: 'doc_table:hideTimeColumn',
  },
  buildDataTableRecord: jest.fn(),
  getChartHidden: jest.fn().mockReturnValue(undefined),
  getDefaultSort: jest.fn().mockReturnValue([]),
  getSortArray: jest.fn().mockReturnValue([]),
  getTableHidden: jest.fn().mockReturnValue(undefined),
  getSidebarHidden: jest.fn().mockReturnValue(undefined),
}));

jest.mock('@kbn/data-plugin/common', () => ({
  getEsQueryConfig: jest.fn().mockReturnValue({}),
  createEscapeValue: jest.fn().mockReturnValue(() => ''),
  getCalculateAutoTimeExpression: jest.fn().mockReturnValue(jest.fn()),
  UI_SETTINGS: {
    HISTOGRAM_BAR_TARGET: 'HISTOGRAM_BAR_TARGET',
    HISTOGRAM_MAX_BARS: 'HISTOGRAM_MAX_BARS',
    SEARCH_QUERY_LANGUAGE: 'SEARCH_QUERY_LANGUAGE',
    QUERY_ALLOW_LEADING_WILDCARDS: 'QUERY_ALLOW_LEADING_WILDCARDS',
    META_FIELDS: 'metaFields',
    // Add more keys as needed for coverage
  },
  KBN_FIELD_TYPES: {
    DATE: 'date',
    DATE_RANGE: 'date_range',
  },
}));

const mockOnQuerySubmit = jest.fn();

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));

jest.mock('./use_workflow_health_check', () => ({
  useWorkflowHealthCheck: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/hooks/use_space_id', () => {
  return {
    useSpaceId: jest.fn().mockReturnValue('default'),
  };
});

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../workflow_configuration', () => ({
  AlertRetrievalStep: ({
    children,
    hasError,
  }: {
    children: React.ReactNode;
    hasError?: boolean;
  }) => (
    <div data-test-subj="alertRetrievalStep" data-has-error={String(hasError ?? false)}>
      {children}
    </div>
  ),
  GenerationStep: ({ children }: { children?: React.ReactNode }) => (
    <div data-test-subj="generationStep">{children}</div>
  ),
  DefaultAlertRetrievalAccordion: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="defaultAlertRetrievalAccordion">{children}</div>
  ),
  PipelineIndicator: () => <div data-test-subj="pipelineIndicator" />,
  QueryModeSelector: () => <div data-test-subj="queryModeSelector" />,
  ValidationPanel: () => <div data-test-subj="validationPanel" />,
  ValidationStep: ({ children, hasError }: { children: React.ReactNode; hasError?: boolean }) => (
    <div data-test-subj="validationStep" data-has-error={String(hasError ?? false)}>
      {children}
    </div>
  ),
  RetrievalMethodSelector: () => <div data-test-subj="retrievalMethodSelector" />,
  WorkflowConfigurationPanel: ({
    onChange,
  }: {
    onChange: (config: {
      alertRetrievalMode: string;
      alertRetrievalWorkflowIds: string[];
      alertRetrievalWorkflowsEnabled: boolean;
      defaultRetrievalEnabled: boolean;
      esqlQuery?: string;
      skillEnabled: boolean;
      validationWorkflowId: string;
    }) => void;
  }) => (
    <div data-test-subj="workflowConfigurationPanel">
      <button
        data-test-subj="simulateWorkflowConfigChange"
        onClick={() =>
          onChange({
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: true,
            defaultRetrievalEnabled: false,
            esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 200',
            skillEnabled: true,
            validationWorkflowId: 'default',
          })
        }
        type="button"
      />
    </div>
  ),
  hasAtLeastOneRetrievalToggle: ({
    alertRetrievalWorkflowsEnabled,
    defaultRetrievalEnabled,
    skillEnabled,
  }: {
    alertRetrievalWorkflowsEnabled?: boolean;
    defaultRetrievalEnabled?: boolean;
    skillEnabled?: boolean;
  }) => Boolean(skillEnabled || defaultRetrievalEnabled || alertRetrievalWorkflowsEnabled),
  hasEmptyRequiredRetrievalWorkflows: ({
    alertRetrievalWorkflowIds,
    alertRetrievalWorkflowsEnabled,
    defaultRetrievalEnabled,
    skillEnabled,
  }: {
    alertRetrievalWorkflowIds?: string[];
    alertRetrievalWorkflowsEnabled?: boolean;
    defaultRetrievalEnabled?: boolean;
    skillEnabled?: boolean;
  }) =>
    Boolean(alertRetrievalWorkflowsEnabled) &&
    !skillEnabled &&
    !defaultRetrievalEnabled &&
    (alertRetrievalWorkflowIds?.length ?? 0) === 0,
  useFetchDefaultEsqlQuery: jest.fn().mockReturnValue({
    defaultEsqlQuery: undefined,
    fetchDefaultEsqlQuery: jest.fn().mockResolvedValue(undefined),
    isError: false,
    isLoading: false,
  }),
  useWorkflowConfiguration: jest.fn().mockReturnValue({
    clearSettings: jest.fn(),
    isLoading: false,
    updateSettings: jest.fn(),
    workflowConfiguration: {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: [],
      alertRetrievalWorkflowsEnabled: false,
      defaultRetrievalEnabled: false,
      skillEnabled: true,
      validationWorkflowId: 'default',
    },
  }),
}));

jest.mock('../alert_selection/alert_selection_fields', () => ({
  AlertSelectionFields: () => <div data-test-subj="alertSelectionFields" />,
}));

jest.mock('../alert_selection/alert_preview_tabs', () => ({
  AlertPreviewTabs: () => <div data-test-subj="alertPreviewTabs" />,
}));

jest.mock('../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn().mockReturnValue({
    dataView: {
      id: 'security',
      title: 'security',
    },
    status: 'ready',
  }),
}));

jest.mock('../../../../common/lib/kuery', () => ({
  convertToBuildEsQuery: jest
    .fn()
    .mockReturnValue([
      JSON.stringify({ bool: { must: [], filter: [], should: [], must_not: [] } }),
      undefined,
    ]),
}));

jest.mock('../parse_filter_query', () => ({
  parseFilterQuery: jest
    .fn()
    .mockReturnValue({ bool: { must: [], filter: [], should: [], must_not: [] } }),
}));

// Mock for data-plugin/public
jest.mock('@kbn/data-plugin/public', () => ({
  ...jest.requireActual('@kbn/data-plugin/public'),
  FilterManager: jest.fn().mockImplementation(() => mockFilterManager),
}));

// Mock FilterManager so useRef in the hook uses our mock instance
jest.mock('@kbn/data-plugin/public', () => {
  const actual = jest.requireActual('@kbn/data-plugin/public');
  return {
    ...actual,
    FilterManager: jest.fn().mockImplementation(() => mockFilterManager),
  };
});

const defaultProps = {
  connectorId: undefined,
  onConnectorIdSelected: jest.fn(),
  onSettingsChanged: jest.fn(),
  onSettingsReset: jest.fn(),
  onSettingsSave: jest.fn(),
  onGenerate: jest.fn(),
  settings: {
    end: 'now',
    filters: [],
    query: { query: '', language: 'kuery' },
    size: 100,
    start: 'now-15m',
  },
  showConnectorSelector: true,
  stats: null,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useSettingsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: mockFilterManager,
          },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        telemetry: { reportEvent: jest.fn() },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: (props: { onQuerySubmit: jest.Mock }) => {
              if (props.onQuerySubmit) {
                mockOnQuerySubmit.mockImplementation(props.onQuerySubmit);
              }
              return <div data-test-subj="alertSelectionSearchBar" />;
            },
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
  });

  // DRY helper for simulating connector change and save
  function simulateConnectorChangeAndSave(
    result: {
      current: UseSettingsView;
    },
    newConnectorId: string
  ) {
    let handleLocalConnectorIdChange: ((id: string) => void) | undefined;

    // Find the AlertSelection component which might be nested
    const findAlertSelectionProps = (
      element: React.ReactElement
    ): { onConnectorIdSelected?: (id: string) => void } | null => {
      const type = element.type as {
        displayName?: string;
        type?: { displayName?: string };
      };

      // Check for displayName on the type or its type (for memo components)
      const displayName = type?.displayName || type?.type?.displayName;

      if (displayName === 'AlertSelection') {
        return element.props as { onConnectorIdSelected?: (id: string) => void };
      }

      // Check if this element has onConnectorIdSelected prop (direct match)
      if (element.props?.onConnectorIdSelected) {
        return element.props as { onConnectorIdSelected?: (id: string) => void };
      }

      if (element.props && element.props.children) {
        const children = React.Children.toArray(element.props.children);
        for (const child of children) {
          if (React.isValidElement(child)) {
            const found = findAlertSelectionProps(child);
            if (found) {
              return found;
            }
          }
        }
      }
      return null;
    };

    if (React.isValidElement(result.current.settingsView)) {
      const alertSelectionProps = findAlertSelectionProps(
        result.current.settingsView as React.ReactElement
      );
      if (alertSelectionProps) {
        handleLocalConnectorIdChange = alertSelectionProps.onConnectorIdSelected;
      }
    }

    act(() => {
      handleLocalConnectorIdChange?.(newConnectorId);
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    fireEvent.click(screen.getByTestId('save'));
  }

  it('returns alertsPreviewStackBy0 with the default value', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertsPreviewStackBy0).toBe('kibana.alert.rule.name');
  });

  it('returns alertSummaryStackBy0 with the default value', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertSummaryStackBy0).toBe('kibana.alert.rule.name');
  });

  it('returns fetchDefaultEsqlQueryResult', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.fetchDefaultEsqlQueryResult).toEqual(
      expect.objectContaining({
        defaultEsqlQuery: undefined,
        fetchDefaultEsqlQuery: expect.any(Function),
        isError: false,
        isLoading: false,
      })
    );
  });

  it('returns filterManager as a FilterManager instance', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.filterManager).toBe(mockFilterManager);
  });

  it('returns setAlertsPreviewStackBy0 as a function', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    expect(typeof result.current.setAlertsPreviewStackBy0).toBe('function');
  });

  it('returns setAlertSummaryStackBy0 as a function', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    expect(typeof result.current.setAlertSummaryStackBy0).toBe('function');
  });

  it('should return the alert selection component with `AlertSelectionQuery` as settings view', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.settingsView}</TestProviders>);

    expect(screen.getByTestId('connectorFieldDescription')).toBeInTheDocument();
  });

  it('should return the alert selection component with `AlertSelectionRange` as settings view', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.settingsView}</TestProviders>);

    expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
  });

  it('should return reset action button', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('should return save action button', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).toBeInTheDocument();
  });

  it('disables the save button when localConnectorId is null', () => {
    const props = { ...defaultProps, connectorId: undefined };
    const { result } = renderHook(() => useSettingsView(props), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).toBeDisabled();
  });

  it('enables the save button when localConnectorId is set', () => {
    const props = { ...defaultProps, connectorId: 'test-connector' };
    const { result } = renderHook(() => useSettingsView(props), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).not.toBeDisabled();
  });

  it('disables the save and run button when localConnectorId is null', () => {
    const props = { ...defaultProps, connectorId: undefined };
    const { result } = renderHook(() => useSettingsView(props), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('saveAndRun')).toBeDisabled();
  });

  it('enables the save and run button when localConnectorId is set', () => {
    const props = { ...defaultProps, connectorId: 'test-connector' };
    const { result } = renderHook(() => useSettingsView(props), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('saveAndRun')).not.toBeDisabled();
  });

  it('invokes onSettingsSave when the save button is clicked', () => {
    const onSettingsSave = jest.fn();
    const props = {
      ...defaultProps,
      connectorId: 'old-connector',
      onSettingsSave,
    };
    const { result } = renderHook(() => useSettingsView(props), {
      wrapper: TestProviders,
    });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    fireEvent.click(screen.getByTestId('save'));

    expect(onSettingsSave).toHaveBeenCalled();
  });

  it('invokes onConnectorIdSelected when the save button is clicked and the connector changed', () => {
    const onSettingsSave = jest.fn();
    const onConnectorIdSelected = jest.fn();
    const props = {
      ...defaultProps,
      connectorId: 'old-connector',
      onSettingsSave,
      onConnectorIdSelected,
    };
    const { result } = renderHook(() => useSettingsView(props), {
      wrapper: TestProviders,
    });

    simulateConnectorChangeAndSave(result as { current: UseSettingsView }, 'new-connector');

    expect(onConnectorIdSelected).toHaveBeenCalledWith('new-connector');
  });

  describe('when save and run is clicked', () => {
    interface SaveAndRunProps {
      connectorId: string;
      onSettingsSave: jest.Mock;
      onGenerate: jest.Mock;
      onConnectorIdSelected: (connectorId: string) => void;
      onSettingsChanged?: typeof defaultProps.onSettingsChanged;
      onSettingsReset?: typeof defaultProps.onSettingsReset;
      settings: typeof defaultProps.settings;
      showConnectorSelector: boolean;
      stats: null;
    }
    let onSettingsSave: jest.Mock;
    let onGenerate: jest.Mock;
    let props: SaveAndRunProps;

    beforeEach(() => {
      jest.useFakeTimers();
      onSettingsSave = jest.fn();
      onGenerate = jest.fn();
      props = {
        ...defaultProps,
        connectorId: 'test-connector',
        onSettingsSave,
        onGenerate,
        onConnectorIdSelected: jest.fn(), // always provide a function
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('invokes onSettingsSave when save and run is clicked', () => {
      const { result } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });
      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      fireEvent.click(screen.getByTestId('saveAndRun'));

      expect(onSettingsSave).toHaveBeenCalled();
    });

    it('invokes onGenerate when save and run is clicked', () => {
      const { result } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      fireEvent.click(screen.getByTestId('saveAndRun'));
      jest.runAllTimers();

      expect(onGenerate).toHaveBeenCalled();
    });
  });

  describe('when query is submitted', () => {
    it('invokes onSettingsChanged with the new query', () => {
      const onSettingsChanged = jest.fn();
      const props = { ...defaultProps, onSettingsChanged };
      const { result } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });
      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      act(() => {
        mockOnQuerySubmit({ query: { query: 'new query', language: 'kuery' } });
      });

      expect(onSettingsChanged).toHaveBeenCalledWith({
        ...props.settings,
        query: { query: 'new query', language: 'kuery' },
      });
    });
  });

  describe('when time is changed', () => {
    it('invokes onSettingsChanged with the new time', () => {
      const onSettingsChanged = jest.fn();
      const props = { ...defaultProps, onSettingsChanged };
      const { result } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });
      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      act(() => {
        mockOnTimeChange({ start: 'now-1h', end: 'now' });
      });

      expect(onSettingsChanged).toHaveBeenCalledWith({
        ...props.settings,
        start: 'now-1h',
        end: 'now',
      });
    });

    describe('when localConnectorId changes and save is clicked', () => {
      interface LocalConnectorIdProps {
        connectorId: string | undefined;
        onSettingsSave: jest.Mock;
        onConnectorIdSelected: jest.Mock;
        onSettingsChanged?: typeof defaultProps.onSettingsChanged;
        onSettingsReset?: typeof defaultProps.onSettingsReset;
        settings: typeof defaultProps.settings;
        showConnectorSelector: boolean;
        stats: null;
      }
      let props: LocalConnectorIdProps;

      beforeEach(() => {
        props = {
          connectorId: 'old-connector',
          onSettingsSave: jest.fn(),
          onConnectorIdSelected: jest.fn(),
          onSettingsChanged: defaultProps.onSettingsChanged,
          onSettingsReset: defaultProps.onSettingsReset,
          settings: defaultProps.settings,
          showConnectorSelector: defaultProps.showConnectorSelector,
          stats: defaultProps.stats,
        };
      });

      it('calls onConnectorIdSelected', () => {
        const { result } = renderHook(() => useSettingsView(props), {
          wrapper: TestProviders,
        });

        simulateConnectorChangeAndSave(result as { current: UseSettingsView }, 'new-connector');

        expect(props.onConnectorIdSelected).toHaveBeenCalledWith('new-connector');
      });

      it('calls onSettingsSave', () => {
        const { result } = renderHook(() => useSettingsView(props), {
          wrapper: TestProviders,
        });

        simulateConnectorChangeAndSave(result as { current: UseSettingsView }, 'new-connector');

        expect(props.onSettingsSave).toHaveBeenCalled();
      });
    });
  });

  describe('when workflow feature flag is enabled', () => {
    beforeEach(() => {
      const { useIsExperimentalFeatureEnabled } = jest.requireMock(
        '../../../../common/hooks/use_experimental_features'
      );
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      // Mock the feature flag to return true
      mockUseKibana.mockReturnValue({
        services: {
          data: {
            query: {
              filterManager: mockFilterManager,
            },
          },
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(true),
          },
          lens: {
            EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
          },
          telemetry: { reportEvent: jest.fn() },
          uiSettings: {
            get: jest.fn(),
          },
          unifiedSearch: {
            ui: {
              SearchBar: (props: { onQuerySubmit: jest.Mock }) => {
                if (props.onQuerySubmit) {
                  mockOnQuerySubmit.mockImplementation(props.onQuerySubmit);
                }
                return <div data-test-subj="alertSelectionSearchBar" />;
              },
            },
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('renders the alert selection fields when default alert retrieval is enabled', async () => {
      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      // Wait for the feature flag to be loaded
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      await screen.findByTestId('alertSelectionFields');
      expect(screen.getByTestId('alertSelectionFields')).toBeInTheDocument();
    });

    it('renders the validation panel', async () => {
      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      // Wait for the feature flag to be loaded
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      await screen.findByTestId('validationPanel');
      expect(screen.getByTestId('validationPanel')).toBeInTheDocument();
    });

    it('calls clearWorkflowSettings when reset is clicked', async () => {
      const clearSettings = jest.fn();
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings,
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: true,
          validationWorkflowId: 'default',
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      // Wait for the feature flag to be loaded
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      await act(async () => {
        fireEvent.click(screen.getByTestId('reset'));
      });

      expect(clearSettings).toHaveBeenCalled();
    });

    it('calls resetCache on the default ES|QL query hook when reset is clicked', async () => {
      const resetCache = jest.fn();
      const { useFetchDefaultEsqlQuery: mockUseFetchDefaultEsqlQuery, useWorkflowConfiguration } =
        jest.requireMock('../workflow_configuration');
      mockUseFetchDefaultEsqlQuery.mockReturnValue({
        defaultEsqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
        fetchDefaultEsqlQuery: jest.fn().mockResolvedValue(undefined),
        isError: false,
        isLoading: false,
        resetCache,
      });
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: true,
          validationWorkflowId: 'default',
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      await act(async () => {
        fireEvent.click(screen.getByTestId('reset'));
      });

      expect(resetCache).toHaveBeenCalled();
    });

    describe('alertRetrievalHasError', () => {
      it('returns true when all retrieval toggles are disabled', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: false,
            skillEnabled: false,
            validationWorkflowId: 'default',
          },
        });

        const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        rerender();

        expect(result.current.alertRetrievalHasError).toBe(true);
      });

      it('returns false when only the skill toggle is enabled', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: false,
            skillEnabled: true,
            validationWorkflowId: 'default',
          },
        });

        const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        rerender();

        expect(result.current.alertRetrievalHasError).toBe(false);
      });

      it('returns false when default alert retrieval is enabled', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: true,
            skillEnabled: false,
            validationWorkflowId: 'default',
          },
        });

        const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        rerender();

        expect(result.current.alertRetrievalHasError).toBe(false);
      });

      it('returns false when alert retrieval workflows are enabled', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: ['workflow-1'],
            alertRetrievalWorkflowsEnabled: true,
            defaultRetrievalEnabled: false,
            skillEnabled: false,
            validationWorkflowId: 'default',
          },
        });

        const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        rerender();

        expect(result.current.alertRetrievalHasError).toBe(false);
      });

      it('returns false when workflows feature is disabled', () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: false,
            skillEnabled: false,
            validationWorkflowId: '',
          },
        });

        // Feature flag is false by default in beforeEach
        const { result } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        expect(result.current.alertRetrievalHasError).toBe(false);
      });
    });

    describe('validationHasError', () => {
      it('returns true when validation workflow is empty', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: false,
            skillEnabled: true,
            validationWorkflowId: '',
          },
        });

        const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        rerender();

        expect(result.current.validationHasError).toBe(true);
      });

      it('returns false when validation workflow is selected', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: false,
            skillEnabled: true,
            validationWorkflowId: 'default',
          },
        });

        const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        rerender();

        expect(result.current.validationHasError).toBe(false);
      });

      it('returns false when workflows feature is disabled', () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn(),
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: false,
            defaultRetrievalEnabled: false,
            skillEnabled: true,
            validationWorkflowId: '',
          },
        });

        // Feature flag is false by default in beforeEach
        const { result } = renderHook(() => useSettingsView(defaultProps), {
          wrapper: TestProviders,
        });

        expect(result.current.validationHasError).toBe(false);
      });
    });

    it('disables save button when workflow configuration is invalid', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          // Invalid: no alert retrieval method enabled
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: false,
          validationWorkflowId: 'default',
        },
      });

      const props = { ...defaultProps, connectorId: 'test-connector' };
      const { result, rerender } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });

      // Wait for the feature flag to be loaded
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      expect(screen.getByTestId('save')).toBeDisabled();
      expect(screen.getByTestId('saveAndRun')).toBeDisabled();
    });

    it('enables save button when workflow configuration is valid', () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: ['workflow-1'],
          alertRetrievalWorkflowsEnabled: true,
          defaultRetrievalEnabled: false,
          skillEnabled: true,
          validationWorkflowId: 'default',
        },
      });

      const props = { ...defaultProps, connectorId: 'test-connector' };
      const { result } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      expect(screen.getByTestId('save')).not.toBeDisabled();
      expect(screen.getByTestId('saveAndRun')).not.toBeDisabled();
    });

    it('shows validation callout when no alert retrieval method is selected', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: false,
          validationWorkflowId: 'default',
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
    });

    it('does not show validation callout when default workflow is enabled', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: true,
          skillEnabled: false,
          validationWorkflowId: 'default',
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
    });

    it('does not show validation callout when alternative workflow is selected', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: ['workflow-1'],
          alertRetrievalWorkflowsEnabled: true,
          defaultRetrievalEnabled: false,
          skillEnabled: false,
          validationWorkflowId: 'default',
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
    });

    it('renders workflow configuration panel', async () => {
      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      await screen.findByTestId('workflowConfigurationPanel');
      expect(screen.getByTestId('workflowConfigurationPanel')).toBeInTheDocument();
    });

    it('shows validation callout when validation workflow is not selected', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: true, // Valid retrieval; only validation workflow is missing
          validationWorkflowId: '', // Empty validation workflow
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
    });

    it('shows validation callout with multiple errors when both alert retrieval and validation workflow are missing', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: false,
          validationWorkflowId: '',
        },
      });

      const { result, rerender } = renderHook(() => useSettingsView(defaultProps), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.settingsView}</TestProviders>);

      const callout = screen.getByTestId('workflowValidationErrorsCallout');
      expect(callout).toBeInTheDocument();

      // Should show both errors in a list
      const listItems = callout.querySelectorAll('li');
      expect(listItems).toHaveLength(2);
    });

    it('disables save buttons when validation workflow is not selected', async () => {
      const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
      useWorkflowConfiguration.mockReturnValue({
        clearSettings: jest.fn(),
        isLoading: false,
        updateSettings: jest.fn(),
        workflowConfiguration: {
          alertRetrievalMode: 'custom_query',
          alertRetrievalWorkflowIds: [],
          alertRetrievalWorkflowsEnabled: false,
          defaultRetrievalEnabled: false,
          skillEnabled: true,
          validationWorkflowId: '',
        },
      });

      const props = { ...defaultProps, connectorId: 'test-connector' };
      const { result, rerender } = renderHook(() => useSettingsView(props), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender();

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      expect(screen.getByTestId('save')).toBeDisabled();
      expect(screen.getByTestId('saveAndRun')).toBeDisabled();
    });

    describe('workflow configuration draft state (cancel behavior)', () => {
      it('does not persist workflow configuration changes to local storage when configuration changes', async () => {
        const updateSettingsMock = jest.fn();
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: updateSettingsMock,
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: true,
            defaultRetrievalEnabled: false,
            skillEnabled: true,
            validationWorkflowId: 'default',
          },
        });

        const props = {
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
        };
        const { result } = renderHook(() => useSettingsView(props), {
          wrapper: TestProviders,
        });

        render(
          <TestProviders>
            {result.current.settingsView}
            {result.current.actionButtons}
          </TestProviders>
        );

        await act(async () => {
          fireEvent.click(screen.getByTestId('simulateWorkflowConfigChange'));
        });

        expect(updateSettingsMock).not.toHaveBeenCalled();
      });

      it('persists the draft workflow configuration to local storage when save is clicked', async () => {
        const updateSettingsMock = jest.fn().mockReturnValue(true);
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: updateSettingsMock,
          workflowConfiguration: {
            alertRetrievalMode: 'custom_query',
            alertRetrievalWorkflowIds: [],
            alertRetrievalWorkflowsEnabled: true,
            defaultRetrievalEnabled: false,
            skillEnabled: true,
            validationWorkflowId: 'default',
          },
        });

        const props = {
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
        };

        const Wrapper = () => {
          const { actionButtons, settingsView } = useSettingsView(props);
          return (
            <>
              {settingsView}
              {actionButtons}
            </>
          );
        };

        render(
          <TestProviders>
            <Wrapper />
          </TestProviders>
        );

        await act(async () => {
          fireEvent.click(screen.getByTestId('simulateWorkflowConfigChange'));
        });

        updateSettingsMock.mockClear();

        await act(async () => {
          fireEvent.click(screen.getByTestId('save'));
        });

        expect(updateSettingsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 200',
          })
        );
      });
    });

    describe('empty alert retrieval workflows (deferred validation)', () => {
      const emptyWorkflowsConfig = {
        alertRetrievalMode: 'custom_query',
        alertRetrievalWorkflowIds: [],
        alertRetrievalWorkflowsEnabled: true,
        defaultRetrievalEnabled: false,
        skillEnabled: false,
        validationWorkflowId: 'default',
      };

      const mockEmptyWorkflowsConfig = () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn().mockReturnValue(true),
          workflowConfiguration: emptyWorkflowsConfig,
        });
      };

      const renderWrapper = (props: Parameters<typeof useSettingsView>[0]) => {
        const Wrapper = () => {
          const { actionButtons, settingsView } = useSettingsView(props);
          return (
            <>
              {settingsView}
              {actionButtons}
            </>
          );
        };

        return render(
          <TestProviders>
            <Wrapper />
          </TestProviders>
        );
      };

      it('does NOT show the alert retrieval workflows error before a save attempt', () => {
        mockEmptyWorkflowsConfig();

        renderWrapper({
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
        });

        expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
      });

      it('keeps the Save and Save and run buttons enabled before a save attempt', () => {
        mockEmptyWorkflowsConfig();

        renderWrapper({
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
        });

        expect(screen.getByTestId('save')).not.toBeDisabled();
        expect(screen.getByTestId('saveAndRun')).not.toBeDisabled();
      });

      it('cancels the save and reveals the error when Save is clicked with no workflow selected', async () => {
        mockEmptyWorkflowsConfig();
        const onSettingsSave = jest.fn();

        renderWrapper({
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
          onSettingsSave,
        });

        await act(async () => {
          fireEvent.click(screen.getByTestId('save'));
        });

        expect(onSettingsSave).not.toHaveBeenCalled();

        const callout = screen.getByTestId('workflowValidationErrorsCallout');
        expect(callout).toBeInTheDocument();
        expect(callout).toHaveTextContent('Select at least one alert retrieval workflow');
      });

      it('cancels the run when Save and run is clicked with no workflow selected', async () => {
        mockEmptyWorkflowsConfig();
        const onGenerate = jest.fn();
        const onSettingsSave = jest.fn();

        renderWrapper({
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
          onGenerate,
          onSettingsSave,
        });

        await act(async () => {
          fireEvent.click(screen.getByTestId('saveAndRun'));
        });

        expect(onGenerate).not.toHaveBeenCalled();
        expect(onSettingsSave).not.toHaveBeenCalled();
      });

      it('clears the error and allows the save once a workflow source is configured', async () => {
        mockEmptyWorkflowsConfig();
        const onSettingsSave = jest.fn();

        renderWrapper({
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
          onSettingsSave,
        });

        await act(async () => {
          fireEvent.click(screen.getByTestId('save'));
        });

        expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();

        // Simulate the user configuring a retrieval source (the mocked panel
        // enables the skill toggle), which removes the misconfiguration.
        await act(async () => {
          fireEvent.click(screen.getByTestId('simulateWorkflowConfigChange'));
        });

        expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();

        await act(async () => {
          fireEvent.click(screen.getByTestId('save'));
        });

        expect(onSettingsSave).toHaveBeenCalled();
      });

      it('does NOT block the save when the skill toggle is also enabled', async () => {
        const { useWorkflowConfiguration } = jest.requireMock('../workflow_configuration');
        useWorkflowConfiguration.mockReturnValue({
          clearSettings: jest.fn(),
          isLoading: false,
          updateSettings: jest.fn().mockReturnValue(true),
          workflowConfiguration: {
            ...emptyWorkflowsConfig,
            skillEnabled: true,
          },
        });
        const onSettingsSave = jest.fn();

        renderWrapper({
          ...defaultProps,
          connectorId: 'test-connector',
          isWorkflowsEnabledOverride: true,
          onSettingsSave,
        });

        await act(async () => {
          fireEvent.click(screen.getByTestId('save'));
        });

        expect(onSettingsSave).toHaveBeenCalled();
        expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
      });
    });
  });
});
