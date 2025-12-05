/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { type DataView } from '@kbn/data-views-plugin/public';

import { useGetEvents } from './use_get_events';

import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { searchEvents } from './search_events';
import { TestProviders } from '../../../common/mock';
import { useToasts } from '../../../common/lib/kibana';

jest.mock('./search_events');
jest.mock('../../../common/lib/kibana');

const mockDataView = {
  getIndexPattern: jest.fn(() => 'test-index'),
} as unknown as DataView;

describe('useGetEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call searchEvents with correct parameters and return data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.mocked(searchEvents).mockResolvedValue({ isPartial: false, foo: 'bar' } as any);

    const { result } = renderHook(
      () =>
        useGetEvents(mockDataView, {
          eventIds: ['id1', 'id2'],
          sort: [],
          pageIndex: 0,
          itemsPerPage: 10,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => result.current.isSuccess);

    expect(searchEvents).toHaveBeenCalledWith(expect.anything(), mockDataView, {
      eventIds: ['id1', 'id2'],
      sort: [],
      pageIndex: 0,
      itemsPerPage: 10,
    });
    expect(result.current.data).toEqual({ isPartial: false, foo: 'bar' });
  });

  it('should show toast on error (not AbortError)', async () => {
    jest.mocked(searchEvents).mockRejectedValue(new Error('failure'));

    renderHook(
      () =>
        useGetEvents(mockDataView, {
          eventIds: [],
          sort: [],
          pageIndex: 0,
          itemsPerPage: 10,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(useToasts().addError).toHaveBeenCalled());
  });

  it('should not show toast on AbortError', async () => {
    jest.mocked(searchEvents).mockRejectedValue(new AbortError());

    const { rerender } = renderHook(
      (eventIds: string[] = []) =>
        useGetEvents(mockDataView, {
          eventIds,
          sort: [],
          pageIndex: 0,
          itemsPerPage: 10,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(searchEvents).toHaveBeenCalled());
    expect(jest.mocked(useToasts().addError)).not.toHaveBeenCalled();

    // NOTE: just to test if the call count is 1
    jest.mocked(searchEvents).mockRejectedValue(new Error());
    rerender(['mock-event-id']);
    await waitFor(() => expect(useToasts().addError).toHaveBeenCalled());
    expect(jest.mocked(useToasts().addError)).toHaveBeenCalledTimes(1);
  });
});
