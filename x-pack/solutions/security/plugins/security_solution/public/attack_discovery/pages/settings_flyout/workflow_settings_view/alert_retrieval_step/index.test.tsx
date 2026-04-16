/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertRetrievalStep } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { WorkflowConfiguration } from '../../workflow_configuration/types';
import type { UseFetchDefaultEsqlQueryResult } from '../../workflow_configuration/hooks/use_fetch_default_esql_query';

const mockFilterManager = createFilterManagerMock();

jest.mock('./alert_retrieval_content', () => ({
  AlertRetrievalContent: (props: Record<string, unknown>) => (
    <div
      data-test-subj="alertRetrievalContent"
      data-alert-retrieval-has-error={String(props.alertRetrievalHasError)}
      data-connector-id={String(props.connectorId)}
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

describe('AlertRetrievalStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the description text', () => {
    render(
      <TestProviders>
        <AlertRetrievalStep {...defaultProps} />
      </TestProviders>
    );

    expect(
      screen.getByText('Choose how alerts are collected and enriched before generation.')
    ).toBeInTheDocument();
  });

  it('renders AlertRetrievalContent', () => {
    render(
      <TestProviders>
        <AlertRetrievalStep {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertRetrievalContent')).toBeInTheDocument();
  });

  it('passes alertRetrievalHasError to AlertRetrievalContent', () => {
    render(
      <TestProviders>
        <AlertRetrievalStep {...defaultProps} alertRetrievalHasError={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertRetrievalContent')).toHaveAttribute(
      'data-alert-retrieval-has-error',
      'true'
    );
  });

  it('passes connectorId to AlertRetrievalContent', () => {
    render(
      <TestProviders>
        <AlertRetrievalStep {...defaultProps} connectorId="my-connector" />
      </TestProviders>
    );

    expect(screen.getByTestId('alertRetrievalContent')).toHaveAttribute(
      'data-connector-id',
      'my-connector'
    );
  });
});
