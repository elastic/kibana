/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import {
  generateMockIndicator,
  Indicator,
  RawIndicatorFieldId,
} from '../../../../../common/types/indicator';
import { IndicatorsFlyoutTable } from './table_tab';
import { unwrapValue } from '../../utils/unwrap_value';
import { EMPTY_PROMPT_TEST_ID } from './empty_prompt';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import { FLYOUT_TABLE_TEST_ID } from './test_ids';

const mockIndicator: Indicator = generateMockIndicator();

describe('<IndicatorsFlyoutTable />', () => {
  it('should render fields and values in table', () => {
    const context = {
      kqlBarIntegration: false,
    };

    const { getByTestId, getByText, getAllByText } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutTable indicator={mockIndicator} />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );

    expect(getByTestId(FLYOUT_TABLE_TEST_ID)).toBeInTheDocument();

    expect(getByText(RawIndicatorFieldId.Feed)).toBeInTheDocument();

    // There should be two occureces of 'threat.indicator.name' value on the page
    expect(
      getAllByText(unwrapValue(mockIndicator, RawIndicatorFieldId.Name) as string)
    ).toHaveLength(2);

    expect(
      getByText(unwrapValue(mockIndicator, RawIndicatorFieldId.Feed) as string)
    ).toBeInTheDocument();
  });

  it('should render error message on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutTable indicator={{ fields: {} }} />
      </TestProvidersComponent>
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
