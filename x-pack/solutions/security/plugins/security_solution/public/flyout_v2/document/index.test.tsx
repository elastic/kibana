/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentFlyout } from '.';
import { TestProviders } from '../../common/mock';

jest.mock('./header', () => ({ Header: () => <div data-test-subj="mock-header" /> }));
jest.mock('./tabs/overview_tab', () => ({
  OverviewTab: () => <div data-test-subj="mock-overview-tab" />,
}));

const createHit = (): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened: { 'event.kind': 'event' },
    isAnchor: false,
  } as DataTableRecord);

describe('<DocumentFlyout />', () => {
  it('renders the header and overview tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentFlyout
          hit={createHit()}
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('mock-header')).toBeInTheDocument();
    expect(getByTestId('mock-overview-tab')).toBeInTheDocument();
  });
});
