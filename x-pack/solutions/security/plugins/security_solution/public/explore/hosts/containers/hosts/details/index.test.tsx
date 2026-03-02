/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { ID, useHostDetails } from '.';
import { useEntitiesListQuery } from '../../../../entity_analytics/components/entity_store/hooks/use_entities_list_query';
import { useGetEndpointDetails } from '../../../../management/hooks';

jest.mock('../../../../../entity_analytics/components/entity_store/hooks/use_entities_list_query', () => ({
  useEntitiesListQuery: jest.fn(),
}));
jest.mock('../../../../../management/hooks', () => ({
  useGetEndpointDetails: jest.fn(),
}));

const mockUseEntitiesListQuery = useEntitiesListQuery as jest.Mock;
const mockUseGetEndpointDetails = useGetEndpointDetails as jest.Mock;

const defaultProps = {
  endDate: '2020-07-08T08:20:18.966Z',
  entityIdentifiers: { 'host.name': 'my-macbook' },
  id: ID,
  indexNames: ['fakebeat-*'],
  skip: false,
  startDate: '2020-07-07T08:20:18.966Z',
};

describe('useHostDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntitiesListQuery.mockReturnValue({
      data: { records: [], total: 0, inspect: {} },
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseGetEndpointDetails.mockReturnValue({ data: undefined });
  });

  it('fetches from entity store', () => {
    renderHook(() => useHostDetails(defaultProps), {
      wrapper: TestProviders,
    });

    expect(mockUseEntitiesListQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTypes: ['host'],
        page: 1,
        perPage: 1,
        skip: false,
      })
    );
  });

  it('does not fetch when skip = true', () => {
    const props = {
      ...defaultProps,
      skip: true,
    };
    renderHook(() => useHostDetails(props), {
      wrapper: TestProviders,
    });

    expect(mockUseEntitiesListQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });

  it('does not fetch when entityIdentifiers produce no filter', () => {
    mockUseEntitiesListQuery.mockClear();
    renderHook(
      () =>
        useHostDetails({
          ...defaultProps,
          entityIdentifiers: {},
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(mockUseEntitiesListQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });
});
