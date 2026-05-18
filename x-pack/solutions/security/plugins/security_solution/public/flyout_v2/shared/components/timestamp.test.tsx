/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { Timestamp } from './timestamp';
import { TIMESTAMP_TEST_ID } from './test_ids';
import { TestProviders } from '../../../common/mock';

const buildHit = (fields: Record<string, unknown[]>) =>
  buildDataTableRecord({ _id: 'test-hit', fields } as unknown as EsHitRecord);

describe('<Timestamp />', () => {
  it('should render the formatted @timestamp by default', () => {
    const hit = buildHit({ '@timestamp': ['2024-01-15T10:30:00.000Z'] });
    const { getByTestId } = render(
      <TestProviders>
        <Timestamp hit={hit} />
      </TestProviders>
    );

    expect(getByTestId(TIMESTAMP_TEST_ID)).toHaveTextContent('Jan 15, 2024 @ 10:30:00.000');
  });

  it('should render the formatted date for the provided field', () => {
    const hit = buildHit({
      'threat.indicator.first_seen': ['2024-01-15T10:30:00.000Z'],
    });
    const { getByTestId } = render(
      <TestProviders>
        <Timestamp hit={hit} field="threat.indicator.first_seen" />
      </TestProviders>
    );

    expect(getByTestId(TIMESTAMP_TEST_ID)).toHaveTextContent('Jan 15, 2024 @ 10:30:00.000');
  });

  it('should render nothing when the field is absent from the hit', () => {
    const hit = buildHit({});
    const { container } = render(
      <TestProviders>
        <Timestamp hit={hit} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
