/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../../common/mock';
import { AlertsTriggeredTile } from './alerts_triggered_tile';

// Mock the KeyInsightsTile component
jest.mock('../common/key_insights_tile', () => ({
  KeyInsightsTile: jest.fn(({ title, label, getEsqlQuery, id, spaceId, inspectTitle }) => (
    <div data-test-subj="key-insights-tile">
      <div data-test-subj="tile-title" data-props={JSON.stringify(title.props)}>
        {title}
      </div>
      <div data-test-subj="tile-label" data-props={JSON.stringify(label.props)}>
        {label}
      </div>
      <div data-test-subj="tile-id">{id}</div>
      <div data-test-subj="tile-space-id">{spaceId}</div>
      <div data-test-subj="inspect-title" data-props={JSON.stringify(inspectTitle.props)}>
        {inspectTitle}
      </div>
      <div data-test-subj="esql-query">{getEsqlQuery('test-namespace')}</div>
    </div>
  )),
}));

// Mock the ESQL query function
jest.mock('./esql_query', () => ({
  getAlertsTriggeredEsqlCount: jest.fn(() => 'mocked esql query for alerts triggered'),
}));

// Mock the useSignalIndex hook
jest.mock(
  '../../../../../../detections/containers/detection_engine/alerts/use_signal_index',
  () => ({
    useSignalIndex: jest.fn(() => ({
      signalIndexName: 'test-alerts-index',
    })),
  })
);

describe('AlertsTriggeredTile', () => {
  const defaultProps = {
    spaceId: 'test-space',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tile with correct props', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('key-insights-tile')).toBeInTheDocument();
  });

  it('passes correct title to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    const titleElement = getByTestId('tile-title');
    expect(titleElement).toBeInTheDocument();
    const titleProps = JSON.parse(titleElement.getAttribute('data-props') || '{}');
    expect(titleProps.id).toBe('xpack.securitySolution.privmon.alertsTriggered.title');
    expect(titleProps.defaultMessage).toBe('Alerts Triggered');
  });

  it('passes correct label to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    const labelElement = getByTestId('tile-label');
    expect(labelElement).toBeInTheDocument();
    const labelProps = JSON.parse(labelElement.getAttribute('data-props') || '{}');
    expect(labelProps.id).toBe('xpack.securitySolution.privmon.alertsTriggered.label');
    expect(labelProps.defaultMessage).toBe('Alerts Triggered');
  });

  it('passes correct inspect title to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    const inspectTitleElement = getByTestId('inspect-title');
    expect(inspectTitleElement).toBeInTheDocument();
    const inspectTitleProps = JSON.parse(inspectTitleElement.getAttribute('data-props') || '{}');
    expect(inspectTitleProps.id).toBe(
      'xpack.securitySolution.privmon.alertsTriggered.inspectTitle'
    );
    expect(inspectTitleProps.defaultMessage).toBe('Alerts Triggered');
  });

  it('passes correct id to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    const idElement = getByTestId('tile-id');
    expect(idElement).toBeInTheDocument();
    expect(idElement.textContent).toBe('privileged-user-monitoring-alerts-triggered');
  });

  it('passes spaceId to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    const spaceIdElement = getByTestId('tile-space-id');
    expect(spaceIdElement).toBeInTheDocument();
    expect(spaceIdElement.textContent).toBe('test-space');
  });

  it('calls getEsqlQuery function with namespace and uses signalIndexName', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    const esqlQueryElement = getByTestId('esql-query');
    expect(esqlQueryElement).toBeInTheDocument();
    expect(esqlQueryElement.textContent).toBe('mocked esql query for alerts triggered');
  });

  it('renders with different spaceId', () => {
    const propsWithDifferentSpaceId = {
      spaceId: 'different-space',
    };

    const { getByTestId } = render(
      <TestProviders>
        <AlertsTriggeredTile {...propsWithDifferentSpaceId} />
      </TestProviders>
    );

    const spaceIdElement = getByTestId('tile-space-id');
    expect(spaceIdElement.textContent).toBe('different-space');
  });

  it('handles different signal index names from useSignalIndex hook', () => {
    const mockUseSignalIndex = jest.requireMock(
      '../../../../../../detections/containers/detection_engine/alerts/use_signal_index'
    ).useSignalIndex;
    mockUseSignalIndex.mockReturnValue({
      signalIndexName: 'custom-alerts-index',
    });

    render(
      <TestProviders>
        <AlertsTriggeredTile {...defaultProps} />
      </TestProviders>
    );

    expect(mockUseSignalIndex).toHaveBeenCalled();
    expect(document.querySelector('[data-test-subj="key-insights-tile"]')).toBeInTheDocument();
  });
});
