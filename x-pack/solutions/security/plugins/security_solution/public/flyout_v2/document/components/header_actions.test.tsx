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
import { HeaderActions } from './header_actions';
import { RISK_SCORE_TITLE_TEST_ID } from './test_ids';

jest.mock('./risk_score', () => ({
  RiskScore: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mockRiskScore" data-hit-id={hit.id} />
  ),
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.risk_score': '47',
});

const eventHit = createMockHit({
  'event.kind': 'event',
});

const renderHeaderActions = (props: Parameters<typeof HeaderActions>[0]) =>
  render(
    <IntlProvider locale="en">
      <HeaderActions {...props} />
    </IntlProvider>
  );

describe('<HeaderActions />', () => {
  it('should render the risk score block for alerts', () => {
    const { getByTestId } = renderHeaderActions({ hit: alertHit });

    expect(getByTestId(RISK_SCORE_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should pass the hit to the risk score component', () => {
    const { getByTestId } = renderHeaderActions({ hit: alertHit });

    expect(getByTestId('mockRiskScore')).toHaveAttribute('data-hit-id', '1');
  });

  it('should not render for non-alert documents', () => {
    const { container } = renderHeaderActions({ hit: eventHit });

    expect(container).toBeEmptyDOMElement();
  });
});
