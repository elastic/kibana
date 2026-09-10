/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as URL from '../../../hooks/use_url_params';
import { act, fireEvent } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import type { SyntheticsUrlParams } from '../../../utils/url_params/get_supported_url_params';
import { SearchField } from './search_field';

describe('SearchField', () => {
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;
  let updateUrlParamsMock: jest.Mock;

  beforeEach(() => {
    // Drive the component's 300ms `useDebounce` deterministically so the test
    // never depends on a real timer firing on time under CI parallel load.
    jest.useFakeTimers();
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn().mockReturnValue({}), updateUrlParamsMock]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('updates url params when searching', () => {
    const searchInput = 'test input';
    const { getByTestId } = render(<SearchField />);

    fireEvent.change(getByTestId('syntheticsOverviewSearchInput'), {
      target: { value: searchInput },
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(updateUrlParamsMock).toHaveBeenCalledWith({
      query: searchInput,
    });
  });

  it('fills search bar with query', () => {
    const searchInput = 'test input';
    useGetUrlParamsSpy.mockReturnValue({
      query: searchInput,
    } as SyntheticsUrlParams);

    const { getByTestId } = render(<SearchField />);
    const input = getByTestId('syntheticsOverviewSearchInput') as HTMLInputElement;

    expect(input.value).toEqual(searchInput);
  });

  it('re-syncs the input when the URL query is updated externally after the user has typed', () => {
    // Simulates the Error Insights flow: the user types something, the panel
    // (e.g. an emerging-term card) then rewrites the `query` URL param, and
    // the input must reflect the new URL value rather than the stale typed text.
    useGetUrlParamsSpy.mockReturnValue({ query: '' } as SyntheticsUrlParams);

    const { getByTestId, rerender } = render(<SearchField />);
    const input = getByTestId('syntheticsOverviewSearchInput') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'user typed' } });
    expect(input.value).toBe('user typed');

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(updateUrlParamsMock).toHaveBeenCalledWith({ query: 'user typed' });

    useGetUrlParamsSpy.mockReturnValue({ query: 'external value' } as SyntheticsUrlParams);
    rerender(<SearchField />);

    const current = getByTestId('syntheticsOverviewSearchInput') as HTMLInputElement;
    expect(current.value).toBe('external value');
  });
});
