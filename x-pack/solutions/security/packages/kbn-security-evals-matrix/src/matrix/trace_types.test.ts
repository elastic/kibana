/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { directTraceKey, parseDirectTraceKey, traceKey } from './trace_types';

describe('traceKey', () => {
  it('joins the model and column ids with a colon', () => {
    expect(traceKey('eis-openai-gpt-5.5', 'alert-analysis')).toBe(
      'eis-openai-gpt-5.5:alert-analysis'
    );
  });

  it('is stable across calls with the same inputs', () => {
    expect(traceKey('model-a', 'col-a')).toBe(traceKey('model-a', 'col-a'));
  });

  it('distinguishes the model and column positions', () => {
    expect(traceKey('a', 'b')).not.toBe(traceKey('b', 'a'));
  });

  it('keeps prefix-scoped column ids distinct from the bare column', () => {
    expect(traceKey('m', 'prefix:alert-analysis')).not.toBe(traceKey('m', 'alert-analysis'));
  });

  it('is unambiguous for the colon-free ids the config permits', () => {
    const keys = new Set([
      traceKey('vendor-model', 'col'),
      traceKey('vendor', 'model-col'),
      traceKey('vendor-model', 'prefix:col'),
    ]);

    expect(keys.size).toBe(3);
  });
});

describe('directTraceKey / parseDirectTraceKey', () => {
  it('round-trips model, suite and example ids', () => {
    const key = directTraceKey('model-x', 'suite-1', 'example-1');
    expect(parseDirectTraceKey(key)).toEqual({
      modelId: 'model-x',
      suiteId: 'suite-1',
      exampleId: 'example-1',
    });
  });

  it('keeps the same example under two suites distinct', () => {
    expect(directTraceKey('m', 's1', 'shared')).not.toBe(directTraceKey('m', 's2', 'shared'));
  });

  it('does not collide with the prefix-scoped and suite-level two-segment keys', () => {
    expect(parseDirectTraceKey(traceKey('m', 'prefix:alert'))).toBeUndefined();
    expect(parseDirectTraceKey(traceKey('m', 'suite-1'))).toBeUndefined();
    expect(parseDirectTraceKey('no-separator')).toBeUndefined();
  });

  // Regression (round 8): suite ids are validated only as nonempty strings and may
  // contain `:`; the parser used to stop the suite at the next colon, turning a
  // `security:persona` suite into suite `security` + example `persona:alert-a`.
  it('round-trips a suite id containing colons', () => {
    const key = directTraceKey('model-x', 'security:persona', 'alert-a');
    expect(parseDirectTraceKey(key)).toEqual({
      modelId: 'model-x',
      suiteId: 'security:persona',
      exampleId: 'alert-a',
    });
  });

  it('keeps colon-bearing suites distinct from their colon-split prefixes', () => {
    expect(directTraceKey('m', 'security:persona', 'alert-a')).not.toBe(
      directTraceKey('m', 'security', 'persona:alert-a')
    );
  });

  it('rejects a key with a malformed percent escape in the suite component', () => {
    expect(parseDirectTraceKey('m:direct:%zz:example-1')).toBeUndefined();
  });
});
