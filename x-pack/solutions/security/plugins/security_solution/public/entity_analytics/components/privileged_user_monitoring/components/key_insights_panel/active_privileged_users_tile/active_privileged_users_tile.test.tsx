/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../../common/mock';
import { ActivePrivilegedUsersTile } from './active_privileged_users_tile';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

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
  getActivePrivilegedUsersEsqlCount: jest.fn(() => 'mocked esql query for active privileged users'),
}));

const mockDataView: DataViewSpec = {
  id: 'test-dataview',
  title: 'test-*',
  fields: {},
  timeFieldName: '@timestamp',
};

describe('ActivePrivilegedUsersTile', () => {
  const defaultProps = {
    spaceId: 'test-space',
    sourcerDataView: mockDataView,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tile with correct props', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('key-insights-tile')).toBeInTheDocument();
  });

  it('passes correct title to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    const titleElement = getByTestId('tile-title');
    expect(titleElement).toBeInTheDocument();
    const titleProps = JSON.parse(titleElement.getAttribute('data-props') || '{}');
    expect(titleProps.id).toBe('xpack.securitySolution.privmon.activePrivilegedUsers.title');
    expect(titleProps.defaultMessage).toBe('Active Privileged Users');
  });

  it('passes correct label to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    const labelElement = getByTestId('tile-label');
    expect(labelElement).toBeInTheDocument();
    const labelProps = JSON.parse(labelElement.getAttribute('data-props') || '{}');
    expect(labelProps.id).toBe('xpack.securitySolution.privmon.activePrivilegedUsers.label');
    expect(labelProps.defaultMessage).toBe('Active Privileged Users');
  });

  it('passes correct inspect title to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    const inspectTitleElement = getByTestId('inspect-title');
    expect(inspectTitleElement).toBeInTheDocument();
    const inspectTitleProps = JSON.parse(inspectTitleElement.getAttribute('data-props') || '{}');
    expect(inspectTitleProps.id).toBe(
      'xpack.securitySolution.privmon.activePrivilegedUsers.inspectTitle'
    );
    expect(inspectTitleProps.defaultMessage).toBe('Active privileged users');
  });

  it('passes correct id to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    const idElement = getByTestId('tile-id');
    expect(idElement).toBeInTheDocument();
    expect(idElement.textContent).toBe('privileged-user-monitoring-active-users');
  });

  it('passes spaceId to KeyInsightsTile', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    const spaceIdElement = getByTestId('tile-space-id');
    expect(spaceIdElement).toBeInTheDocument();
    expect(spaceIdElement.textContent).toBe('test-space');
  });

  it('calls getEsqlQuery function with namespace', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...defaultProps} />
      </TestProviders>
    );

    const esqlQueryElement = getByTestId('esql-query');
    expect(esqlQueryElement).toBeInTheDocument();
    expect(esqlQueryElement.textContent).toBe('mocked esql query for active privileged users');
  });

  it('renders with different spaceId', () => {
    const propsWithDifferentSpaceId = {
      ...defaultProps,
      spaceId: 'different-space',
    };

    const { getByTestId } = render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...propsWithDifferentSpaceId} />
      </TestProviders>
    );

    const spaceIdElement = getByTestId('tile-space-id');
    expect(spaceIdElement.textContent).toBe('different-space');
  });

  it('renders with different sourcerDataView', () => {
    const differentDataView: DataViewSpec = {
      ...mockDataView,
      id: 'different-dataview',
      title: 'different-*',
    };

    const propsWithDifferentDataView = {
      ...defaultProps,
      sourcerDataView: differentDataView,
    };

    render(
      <TestProviders>
        <ActivePrivilegedUsersTile {...propsWithDifferentDataView} />
      </TestProviders>
    );

    expect(document.querySelector('[data-test-subj="key-insights-tile"]')).toBeInTheDocument();
  });
});
