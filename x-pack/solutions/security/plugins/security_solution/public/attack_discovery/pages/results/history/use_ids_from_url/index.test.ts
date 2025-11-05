/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { useIdsFromUrl } from '.';

const mockSetSearchParams = jest.fn();
let mockSearchParams: URLSearchParams;

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useSearchParams: jest.fn(() => [mockSearchParams, mockSetSearchParams]),
}));

describe('useIdsFromUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSearchParams.mockClear();

    mockSearchParams = new URLSearchParams('');
  });

  it('returns an empty array if no id param is present', () => {
    mockSearchParams = new URLSearchParams('');
    const { result } = renderHook(() => useIdsFromUrl());

    expect(result.current.ids).toEqual([]);
  });

  it('returns a single id if one id param is present', () => {
    mockSearchParams = new URLSearchParams('id=foo');
    const { result } = renderHook(() => useIdsFromUrl());

    expect(result.current.ids).toEqual(['foo']);
  });

  it('returns multiple ids if id param is comma-separated', () => {
    mockSearchParams = new URLSearchParams('id=foo,bar,baz');
    const { result } = renderHook(() => useIdsFromUrl());

    expect(result.current.ids).toEqual(['foo', 'bar', 'baz']);
  });

  it('returns multiple ids if multiple id params are present', () => {
    mockSearchParams = new URLSearchParams('id=foo&id=bar');
    mockSearchParams.append('id', 'baz');
    const { result } = renderHook(() => useIdsFromUrl());

    expect(result.current.ids).toEqual(['foo', 'bar', 'baz']);
  });

  it('decodes ids', () => {
    mockSearchParams = new URLSearchParams('id=foo%20bar,baz%2Cqux');
    const { result } = renderHook(() => useIdsFromUrl());

    expect(result.current.ids).toEqual(['foo bar', 'baz', 'qux']);
  });

  it('returns an empty array if ids param is malformed', () => {
    mockSearchParams = new URLSearchParams('id=');
    const { result } = renderHook(() => useIdsFromUrl());

    expect(result.current.ids).toEqual(['']);
  });

  describe('setIdsUrl', () => {
    let result: ReturnType<typeof renderHook>['result'];
    type UseIdsFromUrlReturn = ReturnType<typeof useIdsFromUrl>;

    describe('when given ids', () => {
      beforeEach(() => {
        mockSearchParams = new URLSearchParams('');
        result = renderHook(() => useIdsFromUrl()).result;
        act(() => {
          (result.current as UseIdsFromUrlReturn).setIdsUrl(['foo', 'bar']);
        });
      });

      it('calls setSearchParams with updated params', () => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(mockSearchParams);
      });

      it('sets the id param correctly', () => {
        expect(mockSearchParams.get('id')).toEqual('foo,bar');
      });
    });

    describe('when setIdsUrl is given an empty array', () => {
      beforeEach(() => {
        mockSearchParams = new URLSearchParams('id=foo');
        result = renderHook(() => useIdsFromUrl()).result;
        act(() => {
          (result.current as UseIdsFromUrlReturn).setIdsUrl([]);
        });
      });

      it('calls setSearchParams with updated params', () => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(mockSearchParams);
      });

      it('deletes the id param', () => {
        expect(mockSearchParams.get('id')).toBeNull();
      });
    });
  });
});
