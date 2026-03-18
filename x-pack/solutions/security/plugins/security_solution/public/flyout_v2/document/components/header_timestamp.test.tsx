/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { HeaderTimestamp } from './header_timestamp';
import { HEADER_TIMESTAMP_TEST_ID } from './test_ids';

jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => (
    <span data-test-subj="mockFormattedDate">{value.toISOString()}</span>
  ),
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('<HeaderTimestamp />', () => {
  it('should render formatted timestamp for an alert document', () => {
    const hit = createMockHit({
      'event.kind': 'signal',
      'kibana.alert.rule.name': 'Test Rule',
      '@timestamp': '2025-01-15T10:30:00.000Z',
    });

    const { getByTestId } = render(<HeaderTimestamp hit={hit} />);

    expect(getByTestId(HEADER_TIMESTAMP_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('mockFormattedDate')).toHaveTextContent('2025-01-15T10:30:00.000Z');
  });

  it('should render formatted timestamp for an event document', () => {
    const hit = createMockHit({
      'event.kind': 'event',
      '@timestamp': '2025-06-20T14:00:00.000Z',
    });

    const { getByTestId } = render(<HeaderTimestamp hit={hit} />);

    expect(getByTestId(HEADER_TIMESTAMP_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('mockFormattedDate')).toHaveTextContent('2025-06-20T14:00:00.000Z');
  });

  it('should return null when @timestamp is missing', () => {
    const hit = createMockHit({
      'event.kind': 'signal',
    });

    const { container } = render(<HeaderTimestamp hit={hit} />);

    expect(container).toBeEmptyDOMElement();
  });
});
