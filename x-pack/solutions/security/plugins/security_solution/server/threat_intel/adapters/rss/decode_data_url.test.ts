/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeDataUrl, isDataUrl } from './decode_data_url';

describe('decodeDataUrl', () => {
  it('returns true for data: URLs via isDataUrl', () => {
    expect(isDataUrl('data:text/plain,hello')).toBe(true);
  });

  it('returns false for http URLs via isDataUrl', () => {
    expect(isDataUrl('https://example.com/feed.xml')).toBe(false);
  });

  it('rejects non-data URLs instead of decoding them', () => {
    expect(() => decodeDataUrl('https://example.com/feed.xml')).toThrow(/Expected a data: URL/);
  });

  it('decodes a percent-encoded RSS fixture payload', () => {
    const xml = '<?xml version="1.0"?><rss><channel><title>x</title></channel></rss>';
    const url = `data:application/rss+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    expect(decodeDataUrl(url)).toBe(xml);
  });

  it('decodes a base64 payload', () => {
    const xml = '<rss/>';
    const url = `data:application/rss+xml;base64,${Buffer.from(xml, 'utf8').toString('base64')}`;
    expect(decodeDataUrl(url)).toBe(xml);
  });

  it('throws when the data: URL has no comma', () => {
    expect(() => decodeDataUrl('data:text/plain')).toThrow(/missing comma/);
  });

  it('rejects decoded fixture payloads above the network response cap', () => {
    const oversized = `data:application/rss+xml,${'a'.repeat(10 * 1024 * 1024 + 1)}`;
    expect(() => decodeDataUrl(oversized)).toThrow(/feed cap/);
  });

  it('rejects base64 payloads whose decoded size exceeds the feed cap', () => {
    const payload = Buffer.alloc(10 * 1024 * 1024 + 1, 0x61).toString('base64');
    const oversized = `data:application/rss+xml;base64,${payload}`;
    expect(() => decodeDataUrl(oversized)).toThrow(/feed cap/);
  });
});
