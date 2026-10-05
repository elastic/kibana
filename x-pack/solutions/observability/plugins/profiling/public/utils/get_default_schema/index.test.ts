/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import { getDefaultSchema } from '.';

describe('getDefaultSchema', () => {
  it('prefers OTel when both schemas have data', () => {
    expect(getDefaultSchema([ProfilingSchema.ECS, ProfilingSchema.OTEL])).toBe(
      ProfilingSchema.OTEL
    );
  });

  it.each(Object.values(ProfilingSchema))(
    'selects %s when it is the only schema with data',
    (schema) => {
      expect(getDefaultSchema([schema])).toBe(schema);
    }
  );

  it('falls back to OTel when no schema has data', () => {
    expect(getDefaultSchema([])).toBe(ProfilingSchema.OTEL);
  });
});
