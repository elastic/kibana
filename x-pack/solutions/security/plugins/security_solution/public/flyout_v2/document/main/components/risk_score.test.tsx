/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { RISK_SCORE_TITLE_TEST_ID, RISK_SCORE_VALUE_TEST_ID } from './test_ids';
import { RiskScore } from './risk_score';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.risk_score': 0,
});

const nonAlertHit = createMockHit({
  'event.kind': 'event',
  'kibana.alert.risk_score': 21,
});

describe('<RiskScore />', () => {
  it('should render the risk score title block', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <RiskScore hit={alertHit} />
      </IntlProvider>
    );

    expect(getByTestId(RISK_SCORE_TITLE_TEST_ID)).toHaveTextContent('Risk score');
  });

  it('should render risk score information', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <RiskScore hit={alertHit} />
      </IntlProvider>
    );

    const riskScore = getByTestId(RISK_SCORE_VALUE_TEST_ID);
    expect(riskScore).toBeInTheDocument();
    expect(riskScore).toHaveTextContent('0');
  });

  it('should render an empty risk score value if missing risk score', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <RiskScore hit={createMockHit({ 'event.kind': 'signal' })} />
      </IntlProvider>
    );

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeEmptyDOMElement();
  });

  it('should render risk score for non-alert documents when a value is present', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <RiskScore hit={nonAlertHit} />
      </IntlProvider>
    );

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toHaveTextContent('21');
  });
});
