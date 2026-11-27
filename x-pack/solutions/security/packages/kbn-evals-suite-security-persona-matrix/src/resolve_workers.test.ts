/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveWorkers } from './resolve_workers';

describe('resolveWorkers', () => {
  it.each([
    [undefined, 1],
    ['', 1],
    ['1', 1],
    ['2', 2],
    ['3', 3],
  ])('accepts %p as %p worker(s) without warning', (raw, expected) => {
    const warn = jest.fn();
    expect(resolveWorkers(raw, warn)).toBe(expected);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['4', '8', '0', 'two', '2.5'])(
    'falls back to 1 worker and warns for unsupported value %p',
    (raw) => {
      const warn = jest.fn();
      expect(resolveWorkers(raw, warn)).toBe(1);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(`PERSONA_MATRIX_WORKERS="${raw}"`);
    }
  );
});
