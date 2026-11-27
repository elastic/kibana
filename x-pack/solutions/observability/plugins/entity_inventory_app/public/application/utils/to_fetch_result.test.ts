/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFetchResult } from './to_fetch_result';

const INITIAL = { items: [] as string[] };
const RESPONSE = { items: ['one'] };
const refresh = jest.fn();

describe('toFetchResult', () => {
  it('reports loading with the initial value before the request starts', () => {
    // `useAbortableAsync` reports `loading: false` on the first render, before its effect runs.
    expect(toFetchResult({ loading: false, refresh }, INITIAL)).toEqual({
      data: INITIAL,
      loading: true,
      error: undefined,
      refresh,
    });
  });

  it('reports loading while the first request is in flight', () => {
    expect(toFetchResult({ loading: true, refresh }, INITIAL)).toMatchObject({
      data: INITIAL,
      loading: true,
    });
  });

  it('reports the response once it arrives', () => {
    expect(toFetchResult({ value: RESPONSE, loading: false, refresh }, INITIAL)).toMatchObject({
      data: RESPONSE,
      loading: false,
      error: undefined,
    });
  });

  it('keeps the previous response while a reload is in flight', () => {
    expect(toFetchResult({ value: RESPONSE, loading: true, refresh }, INITIAL)).toMatchObject({
      data: RESPONSE,
      loading: true,
    });
  });

  it('falls back to the initial value and stops loading when the request failed', () => {
    const error = new Error('Request failed');
    expect(toFetchResult({ error, loading: false, refresh }, INITIAL)).toMatchObject({
      data: INITIAL,
      loading: false,
      error,
    });
  });

  it('reports loading again while a retry after a failure is in flight', () => {
    const error = new Error('Request failed');
    expect(toFetchResult({ error, loading: true, refresh }, INITIAL)).toMatchObject({
      data: INITIAL,
      loading: true,
      error,
    });
  });
});
