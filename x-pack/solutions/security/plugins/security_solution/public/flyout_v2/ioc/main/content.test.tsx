/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Content } from './content';
import { IOC_DETAILS_BODY_TEST_ID } from './test_ids';
import type { RightPanelTabType } from './tabs';

const mockTabs: RightPanelTabType[] = [
  {
    id: 'overview',
    name: <>{'Overview'}</>,
    content: <div data-test-subj="overview-content">{'Overview content'}</div>,
    'data-test-subj': 'overview-tab',
  },
  {
    id: 'table',
    name: <>{'Table'}</>,
    content: <div data-test-subj="table-content">{'Table content'}</div>,
    'data-test-subj': 'table-tab',
  },
];

describe('<Content />', () => {
  it('should render the body container', () => {
    const { getByTestId } = render(<Content tabs={mockTabs} selectedTabId="overview" />);
    expect(getByTestId(IOC_DETAILS_BODY_TEST_ID)).toBeInTheDocument();
  });

  it('should render the overview tab content when overview is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <Content tabs={mockTabs} selectedTabId="overview" />
    );
    expect(getByTestId('overview-content')).toBeInTheDocument();
    expect(queryByTestId('table-content')).not.toBeInTheDocument();
  });

  it('should render the table tab content when table is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <Content tabs={mockTabs} selectedTabId="table" />
    );
    expect(getByTestId('table-content')).toBeInTheDocument();
    expect(queryByTestId('overview-content')).not.toBeInTheDocument();
  });
});
