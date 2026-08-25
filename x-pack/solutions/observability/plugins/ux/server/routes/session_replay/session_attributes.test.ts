/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  activitySearchTokens,
  actionFromHit,
  countDeadAndErrorClicks,
  errorGroupFromHit,
  isErrorHit,
  userFromHits,
} from './session_attributes';

describe('userFromHits', () => {
  it('finds an email on a later event after anonymous page loads', () => {
    expect(
      userFromHits([
        { _source: { name: 'documentLoad', attributes: {} } },
        {
          _source: {
            name: 'click',
            resource: { attributes: { 'user.email': 'dave.denscombe@elastic.co' } },
          },
        },
      ])
    ).toEqual({
      id: null,
      email: 'dave.denscombe@elastic.co',
      name: null,
    });
  });
});

describe('activitySearchTokens', () => {
  it('maps shop click labels to xpath tokens', () => {
    expect(activitySearchTokens('Add to cart')).toEqual(['data-add', 'product-grid']);
    expect(activitySearchTokens('Checkout')).toEqual(['@id="checkout"', 'checkout']);
  });

  it('falls back to the raw label', () => {
    expect(activitySearchTokens('  Custom CTA  ')).toEqual(['Custom CTA']);
  });
});

describe('isErrorHit', () => {
  it('treats OTel event_name error as an error', () => {
    expect(isErrorHit({ event_name: 'error', attributes: { 'event.name': 'error' } })).toBe(true);
    expect(isErrorHit({ name: 'exception' })).toBe(true);
    expect(isErrorHit({ name: 'documentLoad' })).toBe(false);
  });
});

describe('errorGroupFromHit', () => {
  it('builds a key from exception type and message', () => {
    const group = errorGroupFromHit({
      name: 'exception',
      attributes: {
        'exception.type': 'TypeError',
        'exception.message': 'x is not defined\n    at foo',
      },
    });
    expect(group?.key).toBe('TypeError|x is not defined');
    expect(group?.type).toBe('TypeError');
  });
});

describe('countDeadAndErrorClicks', () => {
  const hit = (name: string, ts: string, extra: Record<string, unknown> = {}) => ({
    _source: { name, '@timestamp': ts, ...extra },
  });

  it('counts a click with no follow-up as dead', () => {
    const hits = [hit('click', '2026-01-01T00:00:00.000Z')];
    expect(
      countDeadAndErrorClicks(hits, [
        { xpath: '/btn', ts: Date.parse(hits[0]._source['@timestamp']) },
      ]).dead
    ).toBe(1);
  });

  it('counts a click followed by an exception as an error click', () => {
    const hits = [
      hit('click', '2026-01-01T00:00:00.000Z'),
      hit('exception', '2026-01-01T00:00:00.400Z'),
    ];
    expect(
      countDeadAndErrorClicks(hits, [{ xpath: '/btn', ts: Date.parse('2026-01-01T00:00:00.000Z') }])
        .errorClicks
    ).toBe(1);
  });

  it('does not count a click followed by navigation as dead', () => {
    const hits = [
      hit('click', '2026-01-01T00:00:00.000Z'),
      hit('documentLoad', '2026-01-01T00:00:00.200Z'),
    ];
    expect(
      countDeadAndErrorClicks(hits, [{ xpath: '/btn', ts: Date.parse('2026-01-01T00:00:00.000Z') }])
        .dead
    ).toBe(0);
  });

  it('prefers SDK frustration event names over the click heuristic', () => {
    const hits = [
      hit('click', '2026-01-01T00:00:00.000Z'),
      hit('browser.frustration.rage_click', '2026-01-01T00:00:00.100Z'),
      hit('browser.frustration.dead_click', '2026-01-01T00:00:00.200Z'),
    ];
    expect(
      countDeadAndErrorClicks(hits, [{ xpath: '/btn', ts: Date.parse('2026-01-01T00:00:00.000Z') }])
    ).toEqual({ dead: 1, errorClicks: 0, rage: 1 });
  });
});

describe('actionFromHit', () => {
  const start = Date.parse('2026-01-01T00:00:00.000Z');

  it('maps INP web vitals and long tasks', () => {
    expect(
      actionFromHit(
        {
          name: 'browser.web_vital',
          '@timestamp': '2026-01-01T00:00:01.000Z',
          attributes: {
            'browser.web_vital.name': 'inp',
            'browser.web_vital.value': 180,
            'browser.web_vital.inp.target': 'button#buy',
          },
        },
        start
      )
    ).toMatchObject({ kind: 'inp', label: 'INP · button#buy', detail: '180ms' });

    expect(
      actionFromHit(
        {
          name: 'longtask',
          '@timestamp': '2026-01-01T00:00:02.000Z',
          attributes: {
            'longtask.script_source': 'https://cdn/app.js',
            'longtask.duration': 95,
          },
        },
        start
      )
    ).toMatchObject({ kind: 'longtask', label: 'Long task · https://cdn/app.js' });
  });

  it('labels GraphQL HTTP spans with the operation name', () => {
    expect(
      actionFromHit(
        {
          name: 'POST',
          '@timestamp': '2026-01-01T00:00:03.000Z',
          attributes: {
            'http.request.method': 'POST',
            'http.response.status_code': '200',
            'graphql.operation.name': 'GetCart',
            'url.full': 'https://shop/graphql',
          },
        },
        start
      )
    ).toMatchObject({ kind: 'http', label: 'GQL GetCart', graphqlOperation: 'GetCart' });
  });
});
