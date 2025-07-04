/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { RISK_SCORE_VALUE_TEST_ID } from './test_ids';
import { RiskScore } from './risk_score';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';

describe('<RiskScore />', () => {
  it('should render risk score information', () => {
    const getFieldsData = jest.fn().mockImplementation(mockGetFieldsData);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <RiskScore getFieldsData={getFieldsData} />
      </IntlProvider>
    );

    const riskScore = getByTestId(RISK_SCORE_VALUE_TEST_ID);
    expect(riskScore).toBeInTheDocument();
    expect(riskScore).toHaveTextContent('0');
  });

  it('should render empty component if missing getFieldsData value', () => {
    const getFieldsData = jest.fn();

    const { container } = render(
      <IntlProvider locale="en">
        <RiskScore getFieldsData={getFieldsData} />
      </IntlProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid', () => {
    const getFieldsData = jest.fn().mockImplementation(() => 123);

    const { container } = render(
      <IntlProvider locale="en">
        <RiskScore getFieldsData={getFieldsData} />
      </IntlProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
