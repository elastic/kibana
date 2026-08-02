/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';

import { buildRunsWatchIdSearch, clearRunsWatchIdSearch, readRunsWatchId } from '.';

describe('readRunsWatchId', () => {
  it('reads a managed watch id', () => {
    expect(readRunsWatchId(`?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`)).toBe(
      SYSTEM_SECURITY_WATCH_DEEP_ID
    );
  });

  it('is undefined when the param is absent', () => {
    expect(readRunsWatchId('')).toBeUndefined();
  });

  it('is undefined for an empty param', () => {
    expect(readRunsWatchId('?watchId=')).toBeUndefined();
  });

  it('ignores an id that is not one of the managed watches, rather than 400-ing the route', () => {
    expect(readRunsWatchId('?watchId=not-a-watch')).toBeUndefined();
  });

  it('ignores a very long value, which the route bounds at 256 characters', () => {
    expect(readRunsWatchId(`?watchId=${'a'.repeat(400)}`)).toBeUndefined();
  });

  it('reads the watch id alongside another param', () => {
    expect(readRunsWatchId(`?lifecycle=alert-1&watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`)).toBe(
      SYSTEM_SECURITY_WATCH_DEEP_ID
    );
  });
});

describe('buildRunsWatchIdSearch', () => {
  it('adds the watch filter', () => {
    expect(buildRunsWatchIdSearch('', SYSTEM_SECURITY_WATCH_DEEP_ID)).toBe(
      `?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`
    );
  });

  it('keeps a param the page already had, so opening the lifecycle survives a filter change', () => {
    expect(buildRunsWatchIdSearch('?lifecycle=alert-1', SYSTEM_SECURITY_WATCH_DEEP_ID)).toBe(
      `?lifecycle=alert-1&watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`
    );
  });

  it('replaces an existing filter rather than appending a second one', () => {
    expect(buildRunsWatchIdSearch('?watchId=other', SYSTEM_SECURITY_WATCH_DEEP_ID)).toBe(
      `?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`
    );
  });
});

describe('clearRunsWatchIdSearch', () => {
  it('removes the filter', () => {
    expect(clearRunsWatchIdSearch(`?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`)).toBe('');
  });

  it('keeps the other params', () => {
    expect(
      clearRunsWatchIdSearch(`?lifecycle=alert-1&watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`)
    ).toBe('?lifecycle=alert-1');
  });

  it('is a no-op when there was no filter', () => {
    expect(clearRunsWatchIdSearch('')).toBe('');
  });
});
