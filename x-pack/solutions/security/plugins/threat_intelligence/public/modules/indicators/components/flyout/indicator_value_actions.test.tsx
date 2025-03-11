/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { generateMockFileIndicator, Indicator } from '../../../../../common/types/indicator';
import { render } from '@testing-library/react';
import { IndicatorValueActions } from './indicator_value_actions';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import {
  COPY_TO_CLIPBOARD_BUTTON_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID,
} from './test_ids';

const TEST_ID = 'test';

describe('IndicatorValueActions', () => {
  const indicator: Indicator = generateMockFileIndicator();

  it('should return null if field and value are invalid', () => {
    const field: string = 'invalid';
    const context = {
      kqlBarIntegration: true,
    };
    const { container } = render(
      <IndicatorsFlyoutContext.Provider value={context}>
        <IndicatorValueActions indicator={indicator} field={field} />
      </IndicatorsFlyoutContext.Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should only render add to timeline and copy to clipboard', () => {
    const field: string = 'threat.indicator.name';
    const context = {
      kqlBarIntegration: true,
    };
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorValueActions indicator={indicator} field={field} data-test-subj={TEST_ID} />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );

    const addToTimelineTestId = `${TEST_ID}${TIMELINE_BUTTON_TEST_ID}`;
    const copyToClipboardTestId = `${TEST_ID}${COPY_TO_CLIPBOARD_BUTTON_TEST_ID}`;
    expect(getByTestId(addToTimelineTestId)).toBeInTheDocument();
    expect(getByTestId(copyToClipboardTestId)).toBeInTheDocument();
  });

  it('should render filter in/out and dropdown for add to timeline and copy to clipboard', () => {
    const field: string = 'threat.indicator.name';
    const context = {
      kqlBarIntegration: false,
    };
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorValueActions indicator={indicator} field={field} data-test-subj={TEST_ID} />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );
    const filterInTestId = `${TEST_ID}${FILTER_IN_BUTTON_TEST_ID}`;
    const filterOutTestId = `${TEST_ID}${FILTER_OUT_BUTTON_TEST_ID}`;
    const popoverTestId = `${TEST_ID}${POPOVER_BUTTON_TEST_ID}`;
    expect(getByTestId(filterInTestId)).toBeInTheDocument();
    expect(getByTestId(filterOutTestId)).toBeInTheDocument();
    expect(getByTestId(popoverTestId)).toBeInTheDocument();
  });
});
