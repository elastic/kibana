/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { RiskScore } from './risk_score';
import { RISK_SCORE_VALUE_TEST_ID } from './test_ids';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('<RiskScore />', () => {
  it('should render risk score when present as string', () => {
    const hit = createMockHit({ 'kibana.alert.risk_score': '47' });
    const { getByTestId } = render(<RiskScore hit={hit} />);

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toHaveTextContent('47');
  });

  it('should render risk score when present as number', () => {
    const hit = createMockHit({ 'kibana.alert.risk_score': 99 });
    const { getByTestId } = render(<RiskScore hit={hit} />);

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toHaveTextContent('99');
  });

  it('should render empty when risk score is not present', () => {
    const hit = createMockHit({});
    const { container } = render(<RiskScore hit={hit} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty when risk score is an empty string', () => {
    const hit = createMockHit({ 'kibana.alert.risk_score': '' });
    const { container } = render(<RiskScore hit={hit} />);

    expect(container).toBeEmptyDOMElement();
  });
});
