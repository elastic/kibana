/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildStrictRouteValidationWithZod } from './build_strict_route_validation';

const schema = z.object({
  a: z.string(),
  nested: z.object({ b: z.number() }).optional(),
});

/**
 * Minimal stand-in for the `validationResult` object passed by the Kibana
 * route framework, capturing which branch was taken and what data was provided.
 */
function makeValidationResult() {
  const calls: Array<{ branch: 'ok' | 'badRequest'; data: unknown }> = [];
  return {
    ok: (data: unknown) => {
      calls.push({ branch: 'ok', data });
      return data;
    },
    badRequest: (msg: string) => {
      calls.push({ branch: 'badRequest', data: msg });
      return msg;
    },
    calls,
  };
}

describe('buildStrictRouteValidationWithZod', () => {
  const validate = buildStrictRouteValidationWithZod(schema);

  it('passes valid input through', () => {
    const vr = makeValidationResult();
    validate({ a: 'hello' }, vr as any);
    expect(vr.calls).toHaveLength(1);
    expect(vr.calls[0].branch).toBe('ok');
    expect(vr.calls[0].data).toEqual({ a: 'hello' });
  });

  it('rejects an unknown key at top level', () => {
    const vr = makeValidationResult();
    validate({ a: 'hello', extra: 1 }, vr as any);
    expect(vr.calls).toHaveLength(1);
    expect(vr.calls[0].branch).toBe('badRequest');
  });

  it('rejects an unknown key in a nested object', () => {
    const vr = makeValidationResult();
    validate({ a: 'hello', nested: { b: 1, bad: 2 } }, vr as any);
    expect(vr.calls).toHaveLength(1);
    expect(vr.calls[0].branch).toBe('badRequest');
  });

  it('rejects when the schema itself rejects the value', () => {
    const vr = makeValidationResult();
    validate({ a: 42 }, vr as any); // `a` must be string
    expect(vr.calls).toHaveLength(1);
    expect(vr.calls[0].branch).toBe('badRequest');
  });
});
