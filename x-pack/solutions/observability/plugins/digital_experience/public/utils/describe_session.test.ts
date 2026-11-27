/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SESSIONS_JOURNEY_SIZE } from '../../common/sessions';
import { journeyOf, sessionSignals, shortSessionId } from './describe_session';

describe('journeyOf', () => {
  it.each([
    [['/'], '/'],
    [['/cart', '/checkout'], '/cart → /checkout'],
    [['/', '/cart', '/checkout'], '/ → /cart → /checkout'],
    [['/', '/cart', '/checkout', '/pay', '/done'], '/ → /cart → /checkout +2'],
  ])('shows %j as %s', (journey, expected) => {
    expect(journeyOf({ journey, entryPage: journey[0] })).toBe(expected);
  });

  it('only says there is more once the journey is as long as the server keeps it', () => {
    const journey = Array.from({ length: SESSIONS_JOURNEY_SIZE }, (_, index) => `/page-${index}`);
    expect(journeyOf({ journey, entryPage: journey[0] })).toBe('/page-0 → /page-1 → /page-2 …');
  });

  it('falls back to the entry page, else nothing', () => {
    expect(journeyOf({ journey: [], entryPage: '/landing' })).toBe('/landing');
    expect(journeyOf({ journey: [], entryPage: null })).toBeNull();
  });
});

describe('shortSessionId', () => {
  it('keeps the first 8 characters, as the breadcrumb shows them', () => {
    expect(shortSessionId('92057d2a-d621-4206-93b2-13b2c201b5c4')).toBe('92057d2a');
  });
});

describe('sessionSignals', () => {
  it('lists what broke, then frustration, then the bounce', () => {
    expect(
      sessionSignals({
        jsErrorCount: 1,
        failedRequestCount: 2,
        frustration: { rageClicks: 2, deadClicks: 1, errorClicks: 0, total: 3 },
        bounced: true,
      })
    ).toEqual([
      { id: 'jsErrors', count: 1, color: 'danger' },
      { id: 'failedRequests', count: 2, color: 'warning' },
      { id: 'frustration', count: 3, color: 'danger' },
      { id: 'bounced', color: 'hollow' },
    ]);
  });

  it('leaves out frustration when there is none', () => {
    expect(
      sessionSignals({
        jsErrorCount: 0,
        failedRequestCount: 0,
        frustration: { rageClicks: 0, deadClicks: 0, errorClicks: 0, total: 0 },
        bounced: false,
      })
    ).toEqual([]);
  });
});
