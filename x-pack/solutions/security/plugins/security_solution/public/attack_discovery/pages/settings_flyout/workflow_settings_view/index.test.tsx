/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { WorkflowSettingsView } from '.';
import { TestProviders } from '../../../../common/mock';
import type { WorkflowConfiguration } from '../workflow_configuration/types';
import type { UseFetchDefaultEsqlQueryResult } from '../workflow_configuration/hooks/use_fetch_default_esql_query';
import * as workflowI18n from '../workflow_configuration/translations';
import type { ValidationItem } from '../types';

const mockFilterManager = createFilterManagerMock();

jest.mock('./alert_retrieval_step', () => ({
  AlertRetrievalStep: () => <div data-test-subj="alertRetrievalStep" />,
}));

jest.mock('../alert_selection/connector_field', () => ({
  ConnectorField: () => <div data-test-subj="connectorField" />,
}));

jest.mock('../workflow_configuration', () => ({
  ValidationPanel: ({
    isInvalid,
    onChange,
    value,
  }: {
    isInvalid: boolean;
    onChange: (id: string) => void;
    value: string;
  }) => (
    <div data-test-subj="validationPanel" data-is-invalid={String(isInvalid)} data-value={value} />
  ),
}));

const defaultWorkflowConfiguration: WorkflowConfiguration = {
  alertRetrievalWorkflowIds: [],
  defaultAlertRetrievalMode: 'custom_query',
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
  validationHasError: false,
  setAlertsPreviewStackBy0: jest.fn(),
  setAlertSummaryStackBy0: jest.fn(),
  settings: {
    end: 'now',
    filters: [],
    query: { language: 'kuery', query: '' },
    size: 100,
    start: 'now-15m',
  },
  showConnectorSelector: true,
  workflowConfiguration: defaultWorkflowConfiguration,
  workflowValidationItems: [] as readonly ValidationItem[],
};

describe('WorkflowSettingsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the alert retrieval step', () => {
    render(
      <TestProviders>
        <WorkflowSettingsView {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertRetrievalStep')).toBeInTheDocument();
  });

  it('renders the connector field when showConnectorSelector is true', () => {
    render(
      <TestProviders>
        <WorkflowSettingsView {...defaultProps} showConnectorSelector />
      </TestProviders>
    );

    expect(screen.getByTestId('connectorField')).toBeInTheDocument();
  });

  it('does not render the connector field when showConnectorSelector is false', () => {
    render(
      <TestProviders>
        <WorkflowSettingsView {...defaultProps} showConnectorSelector={false} />
      </TestProviders>
    );

    expect(screen.queryByTestId('connectorField')).not.toBeInTheDocument();
  });

  it('renders the validation panel', () => {
    render(
      <TestProviders>
        <WorkflowSettingsView {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('validationPanel')).toBeInTheDocument();
  });

  describe('EuiSteps rendering', () => {
    it('renders the alert retrieval step title', () => {
      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} />
        </TestProviders>
      );

      expect(
        screen.getByRole('heading', { name: workflowI18n.ALERT_RETRIEVAL_SECTION_TITLE })
      ).toBeInTheDocument();
    });

    it('renders the generation step title', () => {
      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} />
        </TestProviders>
      );

      expect(
        screen.getByRole('heading', { name: workflowI18n.GENERATION_SECTION_TITLE })
      ).toBeInTheDocument();
    });

    it('renders the validation step title', () => {
      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} />
        </TestProviders>
      );

      expect(
        screen.getByRole('heading', { name: workflowI18n.VALIDATION_SECTION_TITLE })
      ).toBeInTheDocument();
    });
  });

  describe('validation errors callout', () => {
    it('does not show validation callout when no items', () => {
      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('workflowValidationWarningsCallout')).not.toBeInTheDocument();
    });

    it('shows error callout when error-level items exist', () => {
      const items: ValidationItem[] = [
        { level: 'error', message: 'Error 1' },
        { level: 'error', message: 'Error 2' },
      ];

      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} workflowValidationItems={items} />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
    });

    it('displays all error-level items in the errors callout', () => {
      const items: ValidationItem[] = [
        { level: 'error', message: 'First error' },
        { level: 'error', message: 'Second error' },
        { level: 'error', message: 'Third error' },
      ];

      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} workflowValidationItems={items} />
        </TestProviders>
      );

      const callout = screen.getByTestId('workflowValidationErrorsCallout');
      const listItems = callout.querySelectorAll('li');

      expect(listItems).toHaveLength(3);

      items.forEach((item, index) => {
        expect(listItems[index]).toHaveTextContent(item.message);
      });
    });

    it('shows warning callout when warning-level items exist', () => {
      const items: ValidationItem[] = [{ level: 'warning', message: 'Warning 1' }];

      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} workflowValidationItems={items} />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowValidationWarningsCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('workflowValidationErrorsCallout')).not.toBeInTheDocument();
    });

    it('displays all warning-level items in the warnings callout', () => {
      const items: ValidationItem[] = [
        { level: 'warning', message: 'First warning' },
        { level: 'warning', message: 'Second warning' },
      ];

      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} workflowValidationItems={items} />
        </TestProviders>
      );

      const callout = screen.getByTestId('workflowValidationWarningsCallout');
      const listItems = callout.querySelectorAll('li');

      expect(listItems).toHaveLength(2);

      items.forEach((item, index) => {
        expect(listItems[index]).toHaveTextContent(item.message);
      });
    });

    it('shows both error and warning callouts when both levels exist', () => {
      const items: ValidationItem[] = [
        { level: 'error', message: 'Error message' },
        { level: 'warning', message: 'Warning message' },
      ];

      render(
        <TestProviders>
          <WorkflowSettingsView {...defaultProps} workflowValidationItems={items} />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowValidationErrorsCallout')).toBeInTheDocument();
      expect(screen.getByTestId('workflowValidationWarningsCallout')).toBeInTheDocument();

      const errorCallout = screen.getByTestId('workflowValidationErrorsCallout');
      expect(errorCallout.querySelectorAll('li')).toHaveLength(1);
      expect(errorCallout.querySelectorAll('li')[0]).toHaveTextContent('Error message');

      const warningCallout = screen.getByTestId('workflowValidationWarningsCallout');
      expect(warningCallout.querySelectorAll('li')).toHaveLength(1);
      expect(warningCallout.querySelectorAll('li')[0]).toHaveTextContent('Warning message');
    });
  });
});
