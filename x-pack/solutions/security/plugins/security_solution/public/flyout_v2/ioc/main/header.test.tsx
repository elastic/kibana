/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Header } from './header';
import { generateMockIndicator } from '../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../common/mock';
import { noopCellActionRenderer } from '../../shared/components/cell_actions';
import { getTabsDisplayed } from './tabs';
import {
  IOC_DETAILS_TITLE_TEST_ID,
  IOC_DETAILS_SUBTITLE_TEST_ID,
  IOC_DETAILS_OVERVIEW_TAB_TEST_ID,
  IOC_DETAILS_TABLE_TAB_TEST_ID,
  IOC_DETAILS_JSON_TAB_TEST_ID,
} from './test_ids';

const mockIndicator = generateMockIndicator();
const tabs = getTabsDisplayed({
  indicator: mockIndicator,
  onViewAllFieldsInTable: jest.fn(),
  renderCellActions: noopCellActionRenderer,
});

describe('<Header />', () => {
  it('should render title and subtitle', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header
          indicator={mockIndicator}
          tabs={tabs}
          selectedTabId="overview"
          setSelectedTabId={jest.fn()}
          renderCellActions={noopCellActionRenderer}
        />
      </TestProviders>
    );

    expect(getByTestId(`${IOC_DETAILS_TITLE_TEST_ID}Text`)).toBeInTheDocument();
    expect(getByTestId(IOC_DETAILS_SUBTITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render all tabs', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header
          indicator={mockIndicator}
          tabs={tabs}
          selectedTabId="overview"
          setSelectedTabId={jest.fn()}
          renderCellActions={noopCellActionRenderer}
        />
      </TestProviders>
    );

    expect(getByTestId(IOC_DETAILS_OVERVIEW_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(IOC_DETAILS_TABLE_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(IOC_DETAILS_JSON_TAB_TEST_ID)).toBeInTheDocument();
  });

  it('should call setSelectedTabId when tab is clicked', () => {
    const setSelectedTabId = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <Header
          indicator={mockIndicator}
          tabs={tabs}
          selectedTabId="overview"
          setSelectedTabId={setSelectedTabId}
          renderCellActions={noopCellActionRenderer}
        />
      </TestProviders>
    );

    getByTestId(IOC_DETAILS_TABLE_TAB_TEST_ID).click();
    expect(setSelectedTabId).toHaveBeenCalledWith('table');
  });
});
