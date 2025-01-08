/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProvidersComponent } from '../../../../mocks/test_providers';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsFlyoutOverview } from './overview_tab';
import { EMPTY_PROMPT_TEST_ID } from './empty_prompt';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import {
  INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  INDICATORS_FLYOUT_OVERVIEW_TABLE,
  INDICATORS_FLYOUT_OVERVIEW_TITLE,
} from './test_ids';

describe('<IndicatorsFlyoutOverview />', () => {
  describe('invalid indicator', () => {
    it('should render error message on invalid indicator', () => {
      const context = {
        kqlBarIntegration: false,
      };

      render(
        <TestProvidersComponent>
          <IndicatorsFlyoutContext.Provider value={context}>
            <IndicatorsFlyoutOverview
              onViewAllFieldsInTable={() => {}}
              indicator={{ fields: {} } as unknown as Indicator}
            />
          </IndicatorsFlyoutContext.Provider>
        </TestProvidersComponent>
      );

      expect(screen.getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the highlighted blocks and table when valid indicator is passed', () => {
    const context = {
      kqlBarIntegration: false,
    };

    render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutOverview
            onViewAllFieldsInTable={() => {}}
            indicator={generateMockIndicator()}
          />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );

    expect(screen.queryByTestId(INDICATORS_FLYOUT_OVERVIEW_TABLE)).toBeInTheDocument();
    expect(screen.queryByTestId(INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS)).toBeInTheDocument();
  });

  it('should render the indicator name value in the title', () => {
    const context = {
      kqlBarIntegration: false,
    };
    const indicator: Indicator = generateMockIndicator();
    const indicatorName: string = (indicator.fields['threat.indicator.name'] as string[])[0];

    render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutOverview onViewAllFieldsInTable={() => {}} indicator={indicator} />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );

    expect(screen.queryByTestId(INDICATORS_FLYOUT_OVERVIEW_TITLE)?.innerHTML).toContain(
      indicatorName
    );
  });

  it('should render the indicator name passed via context in the title', () => {
    const context = {
      kqlBarIntegration: false,
      indicatorName: '123',
    };

    render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutOverview
            onViewAllFieldsInTable={() => {}}
            indicator={generateMockIndicator()}
          />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );

    expect(screen.queryByTestId(INDICATORS_FLYOUT_OVERVIEW_TITLE)?.innerHTML).toContain(
      context.indicatorName
    );
  });
});
