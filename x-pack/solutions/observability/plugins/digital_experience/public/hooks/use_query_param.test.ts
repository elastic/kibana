/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useQueryParam } from './use_query_param';
import { useSourceFilter } from './use_source_filter';

jest.mock('react-router-dom', () => ({ useHistory: jest.fn(), useLocation: jest.fn() }));
jest.mock('./use_digital_experience_params');

const push = jest.fn();

const mockRoute = (query: Record<string, string>, search = '') => {
  jest
    .mocked(useDigitalExperienceParams)
    .mockReturnValue({ path: {}, query } as unknown as ReturnType<
      typeof useDigitalExperienceParams
    >);
  jest.mocked(useHistory).mockReturnValue({ push } as unknown as ReturnType<typeof useHistory>);
  jest
    .mocked(useLocation)
    .mockReturnValue({ pathname: '/', search, hash: '' } as ReturnType<typeof useLocation>);
};

beforeEach(() => jest.clearAllMocks());

describe('useQueryParam', () => {
  it('reads the param, undefined when unset or empty', () => {
    mockRoute({ environment: 'production' });
    expect(renderHook(() => useQueryParam('environment')).result.current.value).toBe('production');

    mockRoute({ environment: '' });
    expect(renderHook(() => useQueryParam('environment')).result.current.value).toBeUndefined();
  });

  it('sets the param and keeps the others', () => {
    mockRoute({}, '?rangeFrom=now-15m&rangeTo=now');
    const { result } = renderHook(() => useQueryParam('environment'));

    act(() => result.current.setValue('production'));

    // Sorted like the router's links, which the breadcrumbs compare with the URL.
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'environment=production&rangeFrom=now-15m&rangeTo=now' })
    );
  });

  it('removes the param for undefined', () => {
    mockRoute({ sourceFilter: 'otel' }, '?rangeFrom=now-15m&sourceFilter=otel');
    const { result } = renderHook(() => useQueryParam('sourceFilter'));

    act(() => result.current.setValue(undefined));

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ search: 'rangeFrom=now-15m' }));
  });
});

describe('useSourceFilter', () => {
  it('reads the source filter', () => {
    mockRoute({ sourceFilter: 'otel' });
    expect(renderHook(() => useSourceFilter()).result.current.sourceFilter).toBe('otel');
  });
});
