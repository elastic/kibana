/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import { getDefaultSchema } from '.';

const ALL_SCHEMAS = Object.values(ProfilingSchema);

describe('getDefaultSchema', () => {
  it('prefers OTel when both schemas have data', () => {
    expect(getDefaultSchema([ProfilingSchema.ECS, ProfilingSchema.OTEL], ALL_SCHEMAS)).toBe(
      ProfilingSchema.OTEL
    );
  });

  it.each(ALL_SCHEMAS)('selects %s when it is the only schema with data', (schema) => {
    expect(getDefaultSchema([schema], ALL_SCHEMAS)).toBe(schema);
  });

  describe('when no schema has data', () => {
    it('prefers OTel when both schemas are supported', () => {
      expect(getDefaultSchema([], ALL_SCHEMAS)).toBe(ProfilingSchema.OTEL);
    });

    it.each(ALL_SCHEMAS)('selects %s when it is the only supported schema', (schema) => {
      expect(getDefaultSchema([], [schema])).toBe(schema);
    });

    it('falls back to OTel when no schema is supported', () => {
      expect(getDefaultSchema([], [])).toBe(ProfilingSchema.OTEL);
    });
  });
});
