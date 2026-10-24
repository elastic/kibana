/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replayBackdropEventsQuery } from './click_map';

describe('replayBackdropEventsQuery', () => {
  it('fetches only Meta and FullSnapshot when log clicks already exist', () => {
    const request = replayBackdropEventsQuery({
      sessionId: 'session-1',
      needClicks: false,
    });
    expect(request.size).toBe(200);
    expect(request.query.bool.filter).toEqual(
      expect.arrayContaining([
        { terms: { 'attributes.rrweb.type': [2, 4] } },
        expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([{ terms: { 'attributes.session.id': ['session-1'] } }]),
          }),
        }),
      ])
    );
  });

  it('caps incremental replay clicks instead of pulling 10k events', () => {
    const request = replayBackdropEventsQuery({
      sessionId: 'session-1',
      needClicks: true,
    });
    expect(request.size).toBe(2500);
    expect(request.query.bool.filter).toContainEqual({
      terms: { 'attributes.rrweb.type': [2, 3, 4] },
    });
  });
});
