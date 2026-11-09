/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import { profilingSchemaParam } from './default_api_types';

describe('profilingSchemaParam', () => {
  it.each([ProfilingSchema.ECS, ProfilingSchema.OTEL, undefined])('accepts %s', (value) => {
    expect(profilingSchemaParam.validate(value)).toBe(value);
  });

  it('rejects unknown schemas', () => {
    expect(() => profilingSchemaParam.validate('semconv')).toThrow();
  });
});
