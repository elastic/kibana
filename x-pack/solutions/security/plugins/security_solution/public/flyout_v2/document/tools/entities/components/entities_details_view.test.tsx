/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../../common/mock';
import { ENTITIES_DETAILS_TEST_ID } from '../test_ids';
import { EntitiesDetailsView } from './entities_details_view';
import { useEntitiesDetails } from '../hooks/use_entities_details';

jest.mock('../hooks/use_entities_details');

jest.mock('./user_details_view', () => ({
  UserDetailsView: () => <div data-test-subj="userDetailsMock" />,
}));
jest.mock('./host_details_view', () => ({
  HostDetailsView: () => <div data-test-subj="hostDetailsMock" />,
}));

const mockUseEntitiesDetails = jest.mocked(useEntitiesDetails);

const hit = {
  id: '1',
  raw: {},
  flattened: {},
  isAnchor: false,
} as DataTableRecord;

const noopRenderer = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);

describe('<EntitiesDetailsView />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders empty state when there is no entity data', () => {
    mockUseEntitiesDetails.mockReturnValue({
      timestamp: '2025-01-01T00:00:00.000Z',
      user: undefined,
      host: undefined,
      hasAnyEntity: false,
    });

    render(
      <TestProviders>
        <EntitiesDetailsView hit={hit} scopeId="" />
      </TestProviders>
    );

    expect(screen.queryByTestId(ENTITIES_DETAILS_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });

  it('renders user and host panels when entities are present', () => {
    mockUseEntitiesDetails.mockReturnValue({
      timestamp: '2025-01-01T00:00:00.000Z',
      user: { name: 'u1', entityId: undefined },
      host: {
        name: 'h1',
        entityId: undefined,
      },
      hasAnyEntity: true,
    });

    render(
      <TestProviders>
        <EntitiesDetailsView hit={hit} scopeId="" renderCellActions={noopRenderer} />
      </TestProviders>
    );

    expect(screen.getByTestId(ENTITIES_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('userDetailsMock')).toBeInTheDocument();
    expect(screen.getByTestId('hostDetailsMock')).toBeInTheDocument();
  });
});
