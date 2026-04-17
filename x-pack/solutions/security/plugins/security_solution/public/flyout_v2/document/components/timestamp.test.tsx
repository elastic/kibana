/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Timestamp } from './timestamp';
import { TestProviders } from '../../../common/mock';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('<Timestamp />', () => {
  it('should render the formatted timestamp', () => {
    const hit = createMockHit({
      '@timestamp': '2024-01-15T10:30:00.000Z',
    });

    const { container } = render(
      <TestProviders>
        <Timestamp hit={hit} />
      </TestProviders>
    );

    expect(container).toHaveTextContent('Jan 15, 2024 @ 10:30:00.000');
  });

  it('should render nothing when timestamp is absent', () => {
    const hit = createMockHit({});

    const { container } = render(
      <TestProviders>
        <Timestamp hit={hit} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render children after the timestamp', () => {
    const hit = createMockHit({ '@timestamp': '2024-01-15T10:30:00.000Z' });

    const { getByText } = render(
      <TestProviders>
        <Timestamp hit={hit}>
          <div>{'test'}</div>
        </Timestamp>
      </TestProviders>
    );

    expect(getByText('test')).toBeInTheDocument();
  });

  it('should not render children when timestamp is absent', () => {
    const hit = createMockHit({});

    const { queryByText } = render(
      <TestProviders>
        <Timestamp hit={hit}>
          <div>{'test'}</div>
        </Timestamp>
      </TestProviders>
    );

    expect(queryByText('test')).not.toBeInTheDocument();
  });
});
