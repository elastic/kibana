/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyKueries } from './stringify_kueries';

describe('stringifyKueries', () => {
  let kueries: Map<string, number[] | string[]>;
  beforeEach(() => {
    kueries = new Map<string, number[] | string[]>();
    kueries.set('foo', ['fooValue1', 'fooValue2']);
    kueries.set('bar', ['barValue']);
  });

  it('stringifies the current values', () => {
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"foo: (fooValue1 OR fooValue2) AND bar: barValue"`
    );
  });

  it('correctly stringifies a single value', () => {
    kueries = new Map<string, string[]>();
    kueries.set('foo', ['fooValue']);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(`"foo: fooValue"`);
  });

  it('returns an empty string for an empty map', () => {
    expect(stringifyKueries(new Map<string, string[]>())).toMatchInlineSnapshot(`""`);
  });

  it('returns an empty string for an empty value', () => {
    kueries = new Map<string, string[]>();
    kueries.set('aField', ['']);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(`""`);
  });

  it('adds quotations if the value contains a space', () => {
    kueries.set('baz', ['baz value']);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"foo: (fooValue1 OR fooValue2) AND bar: barValue AND baz: \\"baz value\\""`
    );
  });

  it('adds quotations inside parens if there are values containing spaces', () => {
    kueries.set('foo', ['foo value 1', 'foo value 2']);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"foo: (\\"foo value 1\\" OR \\"foo value 2\\") AND bar: barValue"`
    );
  });

  it('handles parens for values with greater than 2 items', () => {
    kueries.set('foo', ['val1', 'val2', 'val3']);
    kueries.set('baz', ['baz 1', 'baz 2']);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"foo: (val1 OR val2 OR val3) AND bar: barValue AND baz: (\\"baz 1\\" OR \\"baz 2\\")"`
    );
  });

  it('handles number values', () => {
    kueries.set('port', [80, 8080, 443]);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"foo: (fooValue1 OR fooValue2) AND bar: barValue AND port: (80 OR 8080 OR 443)"`
    );
  });

  it('handles colon characters in values', () => {
    kueries.set('monitor.id', ['https://elastic.co', 'https://example.com']);
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"foo: (fooValue1 OR fooValue2) AND bar: barValue AND monitor.id: (\\"https://elastic.co\\" OR \\"https://example.com\\")"`
    );
  });

  it('handles precending empty array', () => {
    kueries = new Map<string, string[]>(
      Object.entries({
        'monitor.type': [],
        'observer.geo.name': ['us-east', 'apj', 'sydney', 'us-west'],
        tags: [],
        'url.port': [],
      })
    );
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"observer.geo.name: (us-east OR apj OR sydney OR us-west)"`
    );
  });

  it('handles skipped empty arrays', () => {
    kueries = new Map<string, string[]>(
      Object.entries({
        tags: ['tag1', 'tag2'],
        'monitor.type': ['http'],
        'url.port': [],
        'observer.geo.name': ['us-east', 'apj', 'sydney', 'us-west'],
      })
    );
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"tags: (tag1 OR tag2) AND monitor.type: http AND observer.geo.name: (us-east OR apj OR sydney OR us-west)"`
    );
  });

  it('handles tags AND logic', () => {
    kueries = new Map<string, string[]>(
      Object.entries({
        'monitor.type': ['http'],
        'url.port': [],
        'observer.geo.name': ['us-east', 'apj', 'sydney', 'us-west'],
        tags: ['tag1', 'tag2'],
      })
    );
    expect(stringifyKueries(kueries, true)).toMatchInlineSnapshot(
      `"monitor.type: http AND observer.geo.name: (us-east OR apj OR sydney OR us-west) AND tags: (tag1 AND tag2)"`
    );
  });

  it('handles tags AND logic with only tags', () => {
    kueries = new Map<string, string[]>(
      Object.entries({
        'monitor.type': [],
        'url.port': [],
        'observer.geo.name': [],
        tags: ['tag1', 'tag2'],
      })
    );
    expect(stringifyKueries(kueries, true)).toMatchInlineSnapshot(`"tags: (tag1 AND tag2)"`);
  });

  it('handles values with spaces', () => {
    kueries = new Map<string, string[]>(
      Object.entries({
        tags: ['Weird tag'],
        'monitor.type': ['http'],
        'url.port': [],
        'observer.geo.name': ['us east', 'apj', 'sydney', 'us-west'],
      })
    );
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"tags: \\"Weird tag\\" AND monitor.type: http AND observer.geo.name: (\\"us east\\" OR apj OR sydney OR us-west)"`
    );
  });
});
