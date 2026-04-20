/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { SEVERITY_VALUE_TEST_ID } from './test_ids';
import { DocumentSeverity } from './severity';
import { TestProviders } from '../../../common/mock';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('<DocumentSeverity />', () => {
  it('should render severity information', () => {
    const hit = createMockHit({
      'kibana.alert.severity': 'low',
    });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentSeverity hit={hit} />
      </TestProviders>
    );

    const severity = getByTestId(SEVERITY_VALUE_TEST_ID);
    expect(severity).toBeInTheDocument();
    expect(severity).toHaveTextContent('Low');
  });

  it('should render event severity when alert severity is unavailable', () => {
    const hit = createMockHit({
      'event.severity': 3,
    });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentSeverity hit={hit} />
      </TestProviders>
    );

    const severity = getByTestId(SEVERITY_VALUE_TEST_ID);
    expect(severity).toBeInTheDocument();
    expect(severity).toHaveTextContent('3');
  });

  it('should render empty component if missing severity value', () => {
    const hit = createMockHit({});

    const { container } = render(
      <TestProviders>
        <DocumentSeverity hit={hit} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if severity value is invalid', () => {
    const hit = createMockHit({
      'kibana.alert.severity': { value: 'abc' } as unknown as string,
    });

    const { container } = render(
      <TestProviders>
        <DocumentSeverity hit={hit} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render children after the badge', () => {
    const hit = createMockHit({ 'kibana.alert.severity': 'low' });

    const { getByText } = render(
      <TestProviders>
        <DocumentSeverity hit={hit}>
          <div>{'test'}</div>
        </DocumentSeverity>
      </TestProviders>
    );

    expect(getByText('test')).toBeInTheDocument();
  });

  it('should not render children when severity is absent', () => {
    const hit = createMockHit({});

    const { queryByText } = render(
      <TestProviders>
        <DocumentSeverity hit={hit}>
          <div>{'test'}</div>
        </DocumentSeverity>
      </TestProviders>
    );

    expect(queryByText('test')).not.toBeInTheDocument();
  });
});
