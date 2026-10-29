/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMetricsExplorerViewUrl, METRICS_EXPLORER_VIEW_URL } from './common';

describe('getMetricsExplorerViewUrl', () => {
  it('returns the collection url when no id is provided', () => {
    expect(getMetricsExplorerViewUrl()).toBe(METRICS_EXPLORER_VIEW_URL);
  });

  it('appends the id as a single path segment', () => {
    expect(getMetricsExplorerViewUrl('my-view-id')).toBe(`${METRICS_EXPLORER_VIEW_URL}/my-view-id`);
  });

  it('encodes path traversal sequences so the url cannot leave the collection', () => {
    expect(getMetricsExplorerViewUrl('../../status')).toBe(
      `${METRICS_EXPLORER_VIEW_URL}/..%2F..%2Fstatus`
    );
  });

  it('encodes query and fragment delimiters in the id', () => {
    expect(getMetricsExplorerViewUrl('view?foo=bar#baz')).toBe(
      `${METRICS_EXPLORER_VIEW_URL}/view%3Ffoo%3Dbar%23baz`
    );
  });
});
