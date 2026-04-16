/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { AlertRetrievalContent, DEBOUNCE_MS } from '.';
import { TestProviders } from '../../../../../../common/mock';
import type { WorkflowConfiguration } from '../../../workflow_configuration/types';
import type { UseFetchDefaultEsqlQueryResult } from '../../../workflow_configuration/hooks/use_fetch_default_esql_query';

const mockFilterManager = createFilterManagerMock();

const mockUseMatchedAlertsCount = jest.fn().mockReturnValue({ count: 95, loading: false });

jest.mock('../../../alert_selection/hooks/use_matched_alerts_count', () => ({
  useMatchedAlertsCount: (...args: unknown[]) => mockUseMatchedAlertsCount(...args),
}));

jest.mock('../../../alert_selection/alert_selection_fields', () => ({
  AlertSelectionFields: ({ showConnectorSelector }: { showConnectorSelector: boolean }) => (
    <div
      data-test-subj="alertSelectionFields"
      data-show-connector-selector={String(showConnectorSelector)}
    />
  ),
}));

jest.mock('../../../alert_selection/alert_preview_tabs', () => ({
  AlertPreviewTabs: ({
    alertsCount,
    esqlQuery,
    settings,
  }: {
    alertsCount?: number | null;
    esqlQuery?: string;
    settings: { end: string; start: string };
  }) => (
    <div
      data-test-subj="alertPreviewTabs"
      data-alerts-count={alertsCount != null ? String(alertsCount) : ''}
      data-end={settings.end}
      data-esql-query={esqlQuery ?? ''}
      data-start={settings.start}
    />
  ),
}));

const mockOnModeChange = jest.fn();

jest.mock('../../../workflow_configuration', () => ({
  DefaultAlertRetrievalAccordion: ({
    children,
    isEnabled,
    onToggle,
  }: {
    children: React.ReactNode;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
  }) => (
    <div data-test-subj="defaultAlertRetrievalAccordion" data-is-enabled={String(isEnabled)}>
      <button
        data-test-subj="defaultAlertRetrievalToggle"
        onClick={() => onToggle(!isEnabled)}
        type="button"
      />
      {isEnabled && children}
    </div>
  ),
  QueryModeSelector: ({
    mode,
    onModeChange,
  }: {
    mode: string;
    onModeChange: (mode: string) => void;
  }) => {
    mockOnModeChange.mockImplementation(onModeChange);
    return <div data-test-subj="queryModeSelector" data-mode={mode} />;
  },
  WorkflowConfigurationPanel: () => <div data-test-subj="workflowConfigurationPanel" />,
}));

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    dataErrorsControl,
    query,
  }: {
    dataErrorsControl?: { enabled: boolean; onChange: (enabled: boolean) => void };
    query: { esql: string };
  }) => (
    <div
      data-test-subj="esqlLangEditor"
      data-data-errors-enabled={
        dataErrorsControl != null ? String(dataErrorsControl.enabled) : undefined
      }
      data-has-data-errors-control={String(dataErrorsControl != null)}
      data-query={query.esql}
    />
  ),
}));

jest.mock('../../../workflow_configuration/edit_with_ai', () => ({
  EditWithAi: ({
    esqlQuery,
    onEsqlQueryChange,
  }: {
    esqlQuery: string;
    onEsqlQueryChange: (query: string) => void;
  }) => (
    <button
      data-test-subj="editWithAi"
      data-esql-query={esqlQuery}
      onClick={() => onEsqlQueryChange('AI_UPDATED_QUERY')}
      type="button"
    />
  ),
}));

const defaultWorkflowConfiguration: WorkflowConfiguration = {
  alertRetrievalWorkflowIds: [],
  alertRetrievalMode: 'custom_query',
  validationWorkflowId: 'default',
};

const defaultFetchDefaultEsqlQueryResult: UseFetchDefaultEsqlQueryResult = {
  defaultEsqlQuery: undefined,
  fetchDefaultEsqlQuery: jest.fn().mockResolvedValue(undefined),
  isError: false,
  isLoading: false,
  resetCache: jest.fn(),
};

const defaultProps = {
  alertRetrievalHasError: false,
  alertsPreviewStackBy0: 'kibana.alert.rule.name',
  alertSummaryStackBy0: 'kibana.alert.rule.name',
  connectorId: 'test-connector',
  fetchDefaultEsqlQueryResult: defaultFetchDefaultEsqlQueryResult,
  filterManager: mockFilterManager,
  onConnectorIdSelected: jest.fn(),
  onSettingsChanged: jest.fn(),
  onWorkflowConfigurationChange: jest.fn(),
  setAlertsPreviewStackBy0: jest.fn(),
  setAlertSummaryStackBy0: jest.fn(),
  settings: {
    end: 'now',
    filters: [],
    query: { language: 'kuery' as const, query: '' },
    size: 100,
    start: 'now-15m',
  },
  workflowConfiguration: defaultWorkflowConfiguration,
};

describe('AlertRetrievalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default alert retrieval accordion', () => {
    render(
      <TestProviders>
        <AlertRetrievalContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('defaultAlertRetrievalAccordion')).toBeInTheDocument();
  });

  it('passes isEnabled=true when alertRetrievalMode is custom_query', () => {
    render(
      <TestProviders>
        <AlertRetrievalContent {...defaultProps} />
      </TestProviders>
    );

    const accordion = screen.getByTestId('defaultAlertRetrievalAccordion');

    expect(accordion).toHaveAttribute('data-is-enabled', 'true');
  });

  it('passes isEnabled=true when alertRetrievalMode is esql', () => {
    const workflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'esql',
    };

    render(
      <TestProviders>
        <AlertRetrievalContent {...defaultProps} workflowConfiguration={workflowConfiguration} />
      </TestProviders>
    );

    const accordion = screen.getByTestId('defaultAlertRetrievalAccordion');

    expect(accordion).toHaveAttribute('data-is-enabled', 'true');
  });

  it('passes isEnabled=false when alertRetrievalMode is disabled', () => {
    const workflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'custom_only',
    };

    render(
      <TestProviders>
        <AlertRetrievalContent {...defaultProps} workflowConfiguration={workflowConfiguration} />
      </TestProviders>
    );

    const accordion = screen.getByTestId('defaultAlertRetrievalAccordion');

    expect(accordion).toHaveAttribute('data-is-enabled', 'false');
  });

  it('always renders the workflow configuration panel', () => {
    render(
      <TestProviders>
        <AlertRetrievalContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('workflowConfigurationPanel')).toBeInTheDocument();
  });

  it('renders the workflow configuration panel when default is disabled', () => {
    const workflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'custom_only',
    };

    render(
      <TestProviders>
        <AlertRetrievalContent {...defaultProps} workflowConfiguration={workflowConfiguration} />
      </TestProviders>
    );

    expect(screen.getByTestId('workflowConfigurationPanel')).toBeInTheDocument();
  });

  describe('QueryModeSelector', () => {
    it('renders the query mode selector when default is enabled', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('queryModeSelector')).toBeInTheDocument();
    });

    it('does not render the query mode selector when default is disabled', () => {
      const workflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'custom_only',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} workflowConfiguration={workflowConfiguration} />
        </TestProviders>
      );

      expect(screen.queryByTestId('queryModeSelector')).not.toBeInTheDocument();
    });

    it('passes mode=custom_query when alertRetrievalMode is custom_query', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('queryModeSelector')).toHaveAttribute('data-mode', 'custom_query');
    });

    it('passes mode=esql when alertRetrievalMode is esql', () => {
      const workflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} workflowConfiguration={workflowConfiguration} />
        </TestProviders>
      );

      expect(screen.getByTestId('queryModeSelector')).toHaveAttribute('data-mode', 'esql');
    });
  });

  describe('when custom_query mode is selected', () => {
    it('renders alert selection fields', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSelectionFields')).toBeInTheDocument();
    });

    it('renders alert preview tabs', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toBeInTheDocument();
    });

    it('does not render ES|QL editor', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('esqlQueryEditor')).not.toBeInTheDocument();
    });

    it('does not render Edit with AI button', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('editWithAi')).not.toBeInTheDocument();
    });

    it('passes showConnectorSelector={false} to AlertSelectionFields', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      const fields = screen.getByTestId('alertSelectionFields');

      expect(fields).toHaveAttribute('data-show-connector-selector', 'false');
    });
  });

  describe('when esql mode is selected', () => {
    const esqlWorkflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'esql',
      esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
    };

    const esqlProps = {
      ...defaultProps,
      workflowConfiguration: esqlWorkflowConfiguration,
    };

    it('renders the ES|QL editor', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('esqlQueryEditor')).toBeInTheDocument();
    });

    it('does not render alert selection fields', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('alertSelectionFields')).not.toBeInTheDocument();
    });

    it('renders alert preview tabs', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toBeInTheDocument();
    });

    it('passes the esqlQuery to ESQLLangEditor', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('esqlLangEditor')).toHaveAttribute(
        'data-query',
        'FROM .alerts-security.alerts-default | LIMIT 100'
      );
    });

    it('passes dataErrorsControl to ESQLLangEditor with errors disabled by default', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      const editor = screen.getByTestId('esqlLangEditor');

      expect(editor).toHaveAttribute('data-has-data-errors-control', 'true');
      expect(editor).toHaveAttribute('data-data-errors-enabled', 'false');
    });

    it('renders the Edit with AI button', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('editWithAi')).toBeInTheDocument();
    });

    it('passes the current esqlQuery to EditWithAi', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...esqlProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('editWithAi')).toHaveAttribute(
        'data-esql-query',
        'FROM .alerts-security.alerts-default | LIMIT 100'
      );
    });

    it('calls onWorkflowConfigurationChange when EditWithAi updates the query', () => {
      const onWorkflowConfigurationChange = jest.fn();

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...esqlProps}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
          />
        </TestProviders>
      );

      screen.getByTestId('editWithAi').click();

      expect(onWorkflowConfigurationChange).toHaveBeenCalledWith({
        ...esqlWorkflowConfiguration,
        esqlQuery: 'AI_UPDATED_QUERY',
      });
    });
  });

  describe('when default is disabled', () => {
    const disabledProps = {
      ...defaultProps,
      workflowConfiguration: {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'custom_only' as const,
      },
    };

    it('does not render alert selection fields', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...disabledProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('alertSelectionFields')).not.toBeInTheDocument();
    });

    it('does not render alert preview tabs', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...disabledProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('alertPreviewTabs')).not.toBeInTheDocument();
    });

    it('does not render ES|QL editor', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...disabledProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('esqlQueryEditor')).not.toBeInTheDocument();
    });
  });

  it('calls onWorkflowConfigurationChange to disable default when toggle is clicked', () => {
    const onWorkflowConfigurationChange = jest.fn();

    render(
      <TestProviders>
        <AlertRetrievalContent
          {...defaultProps}
          onWorkflowConfigurationChange={onWorkflowConfigurationChange}
        />
      </TestProviders>
    );

    screen.getByTestId('defaultAlertRetrievalToggle').click();

    expect(onWorkflowConfigurationChange).toHaveBeenCalledWith({
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'custom_only',
    });
  });

  it('calls onWorkflowConfigurationChange to enable default when toggle is clicked', () => {
    const onWorkflowConfigurationChange = jest.fn();
    const workflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'custom_only',
    };

    render(
      <TestProviders>
        <AlertRetrievalContent
          {...defaultProps}
          onWorkflowConfigurationChange={onWorkflowConfigurationChange}
          workflowConfiguration={workflowConfiguration}
        />
      </TestProviders>
    );

    screen.getByTestId('defaultAlertRetrievalToggle').click();

    expect(onWorkflowConfigurationChange).toHaveBeenCalledWith({
      ...workflowConfiguration,
      alertRetrievalMode: 'custom_query',
    });
  });

  describe('debounced esqlQuery for AlertPreviewTabs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const initialQuery = 'FROM .alerts-security.alerts-default | LIMIT 100';

    const esqlWorkflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'esql',
      esqlQuery: initialQuery,
    };

    it('passes the initial esqlQuery to AlertPreviewTabs on first render', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-esql-query',
        initialQuery
      );
    });

    it('does not update AlertPreviewTabs before the debounce delay elapses', () => {
      const updatedQuery = 'FROM .alerts-security.alerts-default | LIMIT 50';

      const { rerender } = render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={{
              ...esqlWorkflowConfiguration,
              esqlQuery: updatedQuery,
            }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-esql-query',
        initialQuery
      );
    });

    it('updates AlertPreviewTabs after the debounce delay elapses', () => {
      const updatedQuery = 'FROM .alerts-security.alerts-default | LIMIT 50';

      const { rerender } = render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={{
              ...esqlWorkflowConfiguration,
              esqlQuery: updatedQuery,
            }}
          />
        </TestProviders>
      );

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-esql-query',
        updatedQuery
      );
    });

    it('only applies the latest query when multiple changes occur within the debounce window', () => {
      const intermediateQuery = 'FROM .alerts-security.alerts-default | LIMIT 75';
      const finalQuery = 'FROM .alerts-security.alerts-default | LIMIT 25';

      const { rerender } = render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={{
              ...esqlWorkflowConfiguration,
              esqlQuery: intermediateQuery,
            }}
          />
        </TestProviders>
      );

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS / 2);
      });

      rerender(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={{
              ...esqlWorkflowConfiguration,
              esqlQuery: finalQuery,
            }}
          />
        </TestProviders>
      );

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute('data-esql-query', finalQuery);
    });
  });

  describe('query mode change', () => {
    it('fetches default ES|QL query when switching to esql and no esqlQuery exists', async () => {
      const fetchDefaultEsqlQuery = jest
        .fn()
        .mockResolvedValue('FROM .alerts-security.alerts-default | LIMIT 100');
      const onWorkflowConfigurationChange = jest.fn();

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            fetchDefaultEsqlQueryResult={{
              ...defaultFetchDefaultEsqlQueryResult,
              fetchDefaultEsqlQuery,
            }}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
          />
        </TestProviders>
      );

      await mockOnModeChange('esql');

      expect(fetchDefaultEsqlQuery).toHaveBeenCalled();
    });

    it('does not fetch default ES|QL query when switching to esql and esqlQuery already exists', async () => {
      const fetchDefaultEsqlQuery = jest.fn().mockResolvedValue(undefined);
      const onWorkflowConfigurationChange = jest.fn();
      const workflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 50',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            fetchDefaultEsqlQueryResult={{
              ...defaultFetchDefaultEsqlQueryResult,
              fetchDefaultEsqlQuery,
            }}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
            workflowConfiguration={workflowConfiguration}
          />
        </TestProviders>
      );

      await mockOnModeChange('esql');

      expect(fetchDefaultEsqlQuery).not.toHaveBeenCalled();

      expect(onWorkflowConfigurationChange).toHaveBeenCalledWith({
        ...workflowConfiguration,
        alertRetrievalMode: 'esql',
      });
    });

    it('switches to custom_query without fetching', async () => {
      const fetchDefaultEsqlQuery = jest.fn().mockResolvedValue(undefined);
      const onWorkflowConfigurationChange = jest.fn();
      const workflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
        esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            fetchDefaultEsqlQueryResult={{
              ...defaultFetchDefaultEsqlQueryResult,
              fetchDefaultEsqlQuery,
            }}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
            workflowConfiguration={workflowConfiguration}
          />
        </TestProviders>
      );

      await mockOnModeChange('custom_query');

      expect(fetchDefaultEsqlQuery).not.toHaveBeenCalled();

      expect(onWorkflowConfigurationChange).toHaveBeenCalledWith({
        ...workflowConfiguration,
        alertRetrievalMode: 'custom_query',
      });
    });

    it('preserves a mutated esqlQuery when switching from esql to custom_query', async () => {
      const onWorkflowConfigurationChange = jest.fn();
      const mutatedQuery =
        'FROM .alerts-security.alerts-default METADATA _id, _index, _version, _ignored | LIMIT 200';
      const workflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
        esqlQuery: mutatedQuery,
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
            workflowConfiguration={workflowConfiguration}
          />
        </TestProviders>
      );

      await mockOnModeChange('custom_query');

      expect(onWorkflowConfigurationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          alertRetrievalMode: 'custom_query',
          esqlQuery: mutatedQuery,
        })
      );
    });

    it('does not re-fetch the default when switching back to esql after a mutated query was preserved', async () => {
      const fetchDefaultEsqlQuery = jest.fn().mockResolvedValue(undefined);
      const onWorkflowConfigurationChange = jest.fn();
      const mutatedQuery =
        'FROM .alerts-security.alerts-default METADATA _id, _index, _version, _ignored | LIMIT 200';
      const workflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'custom_query',
        esqlQuery: mutatedQuery,
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            fetchDefaultEsqlQueryResult={{
              ...defaultFetchDefaultEsqlQueryResult,
              fetchDefaultEsqlQuery,
            }}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
            workflowConfiguration={workflowConfiguration}
          />
        </TestProviders>
      );

      await mockOnModeChange('esql');

      expect(fetchDefaultEsqlQuery).not.toHaveBeenCalled();
    });
  });

  describe('settings propagation to AlertPreviewTabs', () => {
    it('passes settings start to AlertPreviewTabs in custom_query mode', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-start',
        defaultProps.settings.start
      );
    });

    it('passes settings end to AlertPreviewTabs in custom_query mode', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-end',
        defaultProps.settings.end
      );
    });

    it('passes settings start to AlertPreviewTabs in esql mode', () => {
      const esqlWorkflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
        esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-start',
        defaultProps.settings.start
      );
    });

    it('passes settings end to AlertPreviewTabs in esql mode', () => {
      const esqlWorkflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
        esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute(
        'data-end',
        defaultProps.settings.end
      );
    });

    it('updates AlertPreviewTabs when settings start changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            settings={{ ...defaultProps.settings, start: 'now-1h' }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute('data-start', 'now-1h');
    });

    it('updates AlertPreviewTabs when settings end changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            settings={{ ...defaultProps.settings, end: 'now-5m' }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertPreviewTabs')).toHaveAttribute('data-end', 'now-5m');
    });
  });

  it('does not render a date picker in ES|QL mode', () => {
    const esqlWorkflowConfiguration: WorkflowConfiguration = {
      ...defaultWorkflowConfiguration,
      alertRetrievalMode: 'esql',
      esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
    };

    render(
      <TestProviders>
        <AlertRetrievalContent
          {...defaultProps}
          workflowConfiguration={esqlWorkflowConfiguration}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('esqlDatePicker')).not.toBeInTheDocument();
  });

  describe('useMatchedAlertsCount integration', () => {
    it('passes esqlQuery to useMatchedAlertsCount when in ES|QL mode', () => {
      const esqlWorkflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
        esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      expect(mockUseMatchedAlertsCount).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
        })
      );
    });

    it('does not pass esqlQuery to useMatchedAlertsCount in custom_query mode', () => {
      render(
        <TestProviders>
          <AlertRetrievalContent {...defaultProps} />
        </TestProviders>
      );

      expect(mockUseMatchedAlertsCount).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQuery: undefined,
        })
      );
    });

    it('does not skip the count when in ES|QL mode and default is enabled', () => {
      const esqlWorkflowConfiguration: WorkflowConfiguration = {
        ...defaultWorkflowConfiguration,
        alertRetrievalMode: 'esql',
        esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      };

      render(
        <TestProviders>
          <AlertRetrievalContent
            {...defaultProps}
            workflowConfiguration={esqlWorkflowConfiguration}
          />
        </TestProviders>
      );

      expect(mockUseMatchedAlertsCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: false,
        })
      );
    });
  });
});
