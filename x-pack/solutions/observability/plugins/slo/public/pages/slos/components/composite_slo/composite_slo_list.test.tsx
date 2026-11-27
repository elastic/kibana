/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { useDeleteCompositeSlo } from '../../../../hooks/use_delete_composite_slo';
import { useFetchCompositeSloList } from '../../../../hooks/use_fetch_composite_slo_list';
import { render } from '../../../../utils/test_helper';
import { CompositeSloList } from './composite_slo_list';

jest.mock('../../../../hooks/use_fetch_composite_slo_list');
jest.mock('../../../../hooks/use_delete_composite_slo');
jest.mock('../../../../hooks/use_refresh_composite_slo_summaries');
jest.mock('./composite_slo_table', () => ({
  CompositeSloTable: () => <div data-test-subj="compositeSloTableStub" />,
}));
jest.mock('./composite_slo_toolbar', () => ({
  CompositeSloToolbar: ({
    search,
    onSearchSubmit,
  }: {
    search: string;
    onSearchSubmit: (value: string) => void;
  }) => (
    <>
      <button data-test-subj="submitSameSearch" onClick={() => onSearchSubmit(search)} />
      <button data-test-subj="submitNewSearch" onClick={() => onSearchSubmit('new')} />
    </>
  ),
}));

const useFetchCompositeSloListMock = useFetchCompositeSloList as jest.Mock;
const useDeleteCompositeSloMock = useDeleteCompositeSlo as jest.Mock;

describe('CompositeSloList', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useDeleteCompositeSloMock.mockReturnValue({ mutate: jest.fn() });
    useFetchCompositeSloListMock.mockReturnValue({
      data: { page: 1, perPage: 25, total: 0, results: [] },
      isInitialLoading: false,
      isLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch,
    });
  });

  it('refetches when an unchanged search is submitted', () => {
    render(<CompositeSloList />);
    fireEvent.click(screen.getByTestId('submitSameSearch'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('fetches with the submitted search on the first page without forcing a refetch', () => {
    render(<CompositeSloList />);
    fireEvent.click(screen.getByTestId('submitNewSearch'));
    expect(useFetchCompositeSloListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'new', page: 1 })
    );
    expect(refetch).not.toHaveBeenCalled();
  });
});
