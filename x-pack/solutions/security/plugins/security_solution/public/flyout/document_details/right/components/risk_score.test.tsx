/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { RISK_SCORE_TITLE_TEST_ID, RISK_SCORE_VALUE_TEST_ID } from './test_ids';
import { RiskScore } from './risk_score';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';

const renderRiskScore = (contextValue: DocumentDetailsContext) =>
  render(
    <IntlProvider locale="en">
      <DocumentDetailsContext.Provider value={contextValue}>
        <RiskScore />
      </DocumentDetailsContext.Provider>
    </IntlProvider>
  );

describe('<RiskScore />', () => {
  it('should render risk score information', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
    } as unknown as DocumentDetailsContext;

    const { getByTestId } = renderRiskScore(contextValue);

    expect(getByTestId(RISK_SCORE_TITLE_TEST_ID)).toBeInTheDocument();
    const riskScore = getByTestId(RISK_SCORE_VALUE_TEST_ID);
    expect(riskScore).toBeInTheDocument();
    expect(riskScore).toHaveTextContent('0');
  });

  it('should render empty component if missing getFieldsData value', () => {
    const contextValue = {
      getFieldsData: jest.fn(),
    } as unknown as DocumentDetailsContext;

    const { container } = renderRiskScore(contextValue);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(() => 123),
    } as unknown as DocumentDetailsContext;

    const { container } = renderRiskScore(contextValue);

    expect(container).toBeEmptyDOMElement();
  });
});
