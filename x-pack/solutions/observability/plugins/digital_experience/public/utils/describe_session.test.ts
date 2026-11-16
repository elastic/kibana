/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journeyOf, shortSessionId } from './describe_session';

describe('journeyOf', () => {
  it.each([
    [['/'], '/'],
    [['/cart', '/checkout'], '/cart → /checkout'],
    [['/', '/cart', '/checkout'], '/ → /cart → /checkout'],
    [['/', '/cart', '/checkout', '/pay', '/done'], '/ → /cart → /checkout +2'],
  ])('shows %j as %s', (journey, expected) => {
    expect(journeyOf({ journey, entryPage: journey[0] })).toBe(expected);
  });

  it('does not repeat a page the session stayed on', () => {
    expect(journeyOf({ journey: ['/', '/', '/cart', '/cart'], entryPage: '/' })).toBe('/ → /cart');
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
