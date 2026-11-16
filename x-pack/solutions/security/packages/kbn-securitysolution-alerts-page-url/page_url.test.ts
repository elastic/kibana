/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import { buildPageTimerange, getPageTimerangeBounds } from './page_url';

describe('getPageTimerangeBounds', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-28T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts 28 days before the creation time and ends an hour from now', () => {
    expect(getPageTimerangeBounds('2026-10-20T00:00:00.000Z')).toEqual({
      from: '2026-09-22T00:00:00.000Z',
      to: '2026-10-28T13:00:00.000Z',
    });
  });

  it('is the range the page link encodes', () => {
    const createdAt = '2026-10-20T00:00:00.000Z';

    expect(decode(buildPageTimerange(createdAt))).toEqual({
      global: { linkTo: [], timerange: { ...getPageTimerangeBounds(createdAt), kind: 'absolute' } },
      timeline: {
        linkTo: [],
        timerange: { ...getPageTimerangeBounds(createdAt), kind: 'absolute' },
      },
    });
  });
});
