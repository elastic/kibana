/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useIndicatorById } from './use_indicator_by_id';
import { createFetchIndicatorById } from '../services/fetch_indicator_by_id';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';

jest.mock('../services/fetch_indicator_by_id');
jest.mock('../../../../common/lib/kibana');

const indicatorByIdQueryResult = { _id: 'testId' } as unknown as Indicator;

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderUseIndicatorById = (initialProps = { indicatorId: 'testId' }) =>
  renderHook((props) => useIndicatorById(props.indicatorId), {
    initialProps,
    wrapper,
  });

describe('useIndicatorById()', () => {
  type MockedCreateFetchIndicators = jest.MockedFunction<typeof createFetchIndicatorById>;
  let indicatorsQuery: jest.MockedFunction<ReturnType<typeof createFetchIndicatorById>>;

  beforeEach(jest.clearAllMocks);

  beforeEach(() => {
    indicatorsQuery = jest.fn();
    (createFetchIndicatorById as MockedCreateFetchIndicators).mockReturnValue(indicatorsQuery);
  });

  describe('when mounted', () => {
    it('should create and call the indicatorsQuery', async () => {
      indicatorsQuery.mockResolvedValue(indicatorByIdQueryResult);

      const hookResult = renderUseIndicatorById();

      // isLoading should be true
      expect(hookResult.result.current.isLoading).toEqual(true);

      // indicators service and the query should be called just once
      expect(createFetchIndicatorById as MockedCreateFetchIndicators).toHaveBeenCalledTimes(1);
      expect(indicatorsQuery).toHaveBeenCalledTimes(1);

      // isLoading should turn to false eventually
      await waitFor(() => expect(hookResult.result.current.isLoading).toBe(false));
    });
  });
});
