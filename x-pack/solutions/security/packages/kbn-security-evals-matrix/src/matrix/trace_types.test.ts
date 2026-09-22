/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { traceKey } from './trace_types';

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
