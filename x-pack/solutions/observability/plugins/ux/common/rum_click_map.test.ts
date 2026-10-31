/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  binClicks,
  CLICK_BIN_SESSION_SAMPLE,
  extractPageSnapshot,
  extractReplayClicks,
  inViewportBand,
  isClickMapLongRange,
  isOnSnapshotViewport,
  pathFromHref,
} from './rum_click_map';

describe('pathFromHref', () => {
  it('returns pathname from a full URL', () => {
    expect(pathFromHref('https://shop.example/cart?ref=1')).toBe('/cart');
  });

  it('prefers hash routes that look like paths', () => {
    expect(pathFromHref('https://shop.example/#/account')).toBe('/account');
  });
});

describe('extractPageSnapshot', () => {
  const meta = (href: string, width = 1280, height = 800, timestamp = 1) => ({
    type: 4,
    timestamp,
    data: { href, width, height },
  });
  const snapshot = (timestamp = 2) => ({ type: 2, timestamp, data: { node: { id: 1 } } });

  it('returns Meta + FullSnapshot and ignores synthetic type 99', () => {
    const result = extractPageSnapshot([
      { type: 99, data: { name: 'replay-started' } },
      meta('https://shop.example/'),
      snapshot(),
      { type: 3, timestamp: 3, data: { source: 2 } },
    ]);
    expect(result).not.toBeNull();
    expect(result?.width).toBe(1280);
    expect(result?.height).toBe(800);
    expect(result?.href).toBe('https://shop.example/');
    expect(result?.events).toHaveLength(2);
    expect((result?.events[0] as { type: number }).type).toBe(4);
    expect((result?.events[1] as { type: number }).type).toBe(2);
  });

  it('prefers a Meta whose href matches the page path', () => {
    const result = extractPageSnapshot(
      [
        meta('https://shop.example/'),
        snapshot(2),
        meta('https://shop.example/cart', 1024, 768, 10),
        snapshot(11),
      ],
      '/cart'
    );
    expect(result?.href).toBe('https://shop.example/cart');
    expect(result?.width).toBe(1024);
  });

  it('returns null without a FullSnapshot', () => {
    expect(extractPageSnapshot([meta('https://shop.example/')])).toBeNull();
  });
});

describe('extractReplayClicks', () => {
  it('keeps MouseInteraction clicks on the matching page', () => {
    const clicks = extractReplayClicks(
      [
        { type: 4, data: { href: 'https://kbn/app/ux', width: 1280, height: 800 } },
        { type: 3, data: { source: 2, type: 2, x: 40, y: 80 } },
        { type: 4, data: { href: 'https://kbn/app/discover', width: 1280, height: 800 } },
        { type: 3, data: { source: 2, type: 2, x: 9, y: 9 } },
      ],
      '/app/ux'
    );
    expect(clicks).toEqual([{ x: 40, y: 80 }]);
  });
});

describe('binClicks', () => {
  it('clusters nearby clicks and keeps the hottest bins', () => {
    const binned = binClicks(
      [
        { x: 10, y: 10 },
        { x: 11, y: 9 },
        { x: 200, y: 200 },
      ],
      12,
      10
    );
    expect(binned[0].count).toBe(2);
    expect(binned).toHaveLength(2);
  });

  it('keeps unique session ids on a bin and caps the sample', () => {
    const ids = Array.from({ length: 12 }, (_, index) => `s${index}`);
    const binned = binClicks(
      ids.map((sessionId) => ({ x: 10, y: 10, sessionId })),
      12,
      10
    );
    expect(binned).toHaveLength(1);
    expect(binned[0].count).toBe(12);
    expect(binned[0].sessionIds).toEqual(ids.slice(0, CLICK_BIN_SESSION_SAMPLE));
  });
});

describe('inViewportBand / isOnSnapshotViewport', () => {
  it('accepts nearby viewport widths', () => {
    expect(inViewportBand(1280, 1280)).toBe(true);
    expect(inViewportBand(1200, 1280)).toBe(true);
    expect(inViewportBand(800, 1280)).toBe(false);
    expect(inViewportBand(null, 1280)).toBe(true);
  });

  it('keeps above-the-fold clicks', () => {
    expect(isOnSnapshotViewport({ x: 100, y: 200 }, 1280, 800)).toBe(true);
    expect(isOnSnapshotViewport({ x: 100, y: 4000 }, 1280, 800)).toBe(false);
  });
});

describe('isClickMapLongRange', () => {
  it('is false for ranges of 30 days or less', () => {
    expect(isClickMapLongRange('2026-07-16T00:00:00.000Z', '2026-08-15T00:00:00.000Z')).toBe(false);
    expect(isClickMapLongRange('2026-08-14T00:00:00.000Z', '2026-08-15T00:00:00.000Z')).toBe(false);
  });

  it('is true when the range is longer than 30 days', () => {
    expect(isClickMapLongRange('2026-07-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z')).toBe(true);
  });

  it('is false when either bound is missing or invalid', () => {
    expect(isClickMapLongRange(undefined, '2026-08-15T00:00:00.000Z')).toBe(false);
    expect(isClickMapLongRange('not-a-date', '2026-08-15T00:00:00.000Z')).toBe(false);
  });

  it('understands datemath ranges', () => {
    expect(isClickMapLongRange('now-24h', 'now')).toBe(false);
    expect(isClickMapLongRange('now-90d', 'now')).toBe(true);
  });
});
