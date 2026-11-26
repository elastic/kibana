/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as URL from '../../../hooks/use_url_params';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import type { SyntheticsUrlParams } from '../../../utils/url_params/get_supported_url_params';
import { SearchField } from './search_field';
import { NoMonitorsFound } from './no_monitors_found';

describe('NoMonitorsFound', () => {
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;
  let updateUrlParamsMock: jest.Mock;

  beforeEach(() => {
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn().mockReturnValue({}), updateUrlParamsMock]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('clears url params', async () => {
    const { getByText } = render(<NoMonitorsFound />);

    fireEvent.click(getByText('Clear filters'));

    await waitFor(() => {
      expect(updateUrlParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: undefined,
          statusFilter: undefined,
          tags: undefined,
          locations: undefined,
          monitorTypes: undefined,
        })
      );
    });
  }, 30_000);

  it('does not write a pending search after clear-filters when the URL query was already empty', () => {
    jest.useFakeTimers();
    useGetUrlParamsSpy.mockReturnValue({
      query: '',
      tags: ['prod'],
    } as SyntheticsUrlParams);

    const { getByTestId, getByText } = render(
      <>
        <SearchField />
        <NoMonitorsFound />
      </>
    );

    fireEvent.change(getByTestId('syntheticsOverviewSearchInput'), {
      target: { value: 'checkout' },
    });
    fireEvent.click(getByText('Clear filters'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(updateUrlParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: undefined,
        tags: undefined,
      })
    );
    expect(updateUrlParamsMock).not.toHaveBeenCalledWith({ query: 'checkout' });
    expect((getByTestId('syntheticsOverviewSearchInput') as HTMLInputElement).value).toBe('');
  });
});
