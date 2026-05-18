/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { TOOLS_FLYOUT_HEADER_TEST_ID } from '../../../shared/components/test_ids';
import { EntitiesDetails } from '.';

const mockHit: DataTableRecord = {
  id: '1',
  raw: {},
  flattened: {},
  isAnchor: false,
};

jest.mock('./components/entities_details_view', () => ({
  EntitiesDetailsView: () => <div data-test-subj="entitiesDetailsViewMock" />,
}));

const noopRenderer = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);

describe('<EntitiesDetails />', () => {
  it('renders tools flyout header and details view placeholder', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntitiesDetails hit={mockHit} scopeId="" renderCellActions={noopRenderer} />
      </TestProviders>
    );

    expect(getByTestId(TOOLS_FLYOUT_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('entitiesDetailsViewMock')).toBeInTheDocument();
  });
});
