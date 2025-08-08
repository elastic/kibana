/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AIForSOCDetailsContext } from '../context';
import { mockDataFormattedForFieldBrowser } from '../../document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { mockGetFieldsData } from '../../document_details/shared/mocks/mock_get_fields_data';
import {
  HEADER_INTEGRATION_TITLE_TEST_ID,
  HEADER_RISK_SCORE_TITLE_TEST_ID,
  HEADER_SEVERITY_TITLE_TEST_ID,
  HEADER_SUMMARY_TEST_ID,
  HEADER_TITLE_TEST_ID,
  HeaderTitle,
} from './header_title';
import { useDateFormat, useTimeZone } from '../../../common/lib/kibana';
import {
  RISK_SCORE_VALUE_TEST_ID,
  SEVERITY_VALUE_TEST_ID,
} from '../../document_details/right/components/test_ids';

jest.mock('../../../common/lib/kibana');

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
} as unknown as AIForSOCDetailsContext;

const renderHeader = (contextValue: AIForSOCDetailsContext) =>
  render(
    <TestProviders>
      <AIForSOCDetailsContext.Provider value={contextValue}>
        <HeaderTitle />
      </AIForSOCDetailsContext.Provider>
    </TestProviders>
  );

describe('<AlertHeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
  });

  it('should render component', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(`${HEADER_TITLE_TEST_ID}Text`)).toHaveTextContent('rule-name');
    expect(getByTestId(HEADER_SUMMARY_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(HEADER_SEVERITY_TITLE_TEST_ID)).toHaveTextContent('Severity');
    expect(getByTestId(SEVERITY_VALUE_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(HEADER_RISK_SCORE_TITLE_TEST_ID)).toHaveTextContent('Risk score');
    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(HEADER_INTEGRATION_TITLE_TEST_ID)).toHaveTextContent('Integration');
  });
});
