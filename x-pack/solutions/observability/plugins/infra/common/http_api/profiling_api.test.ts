/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { ProfilingSchema } from '@kbn/profiling-utils';
import {
  InfraProfilingFlamegraphRequestParamsRT,
  InfraProfilingFunctionsRequestParamsRT,
} from './profiling_api';

describe.each([
  ['InfraProfilingFlamegraphRequestParamsRT', InfraProfilingFlamegraphRequestParamsRT, {}],
  [
    'InfraProfilingFunctionsRequestParamsRT',
    InfraProfilingFunctionsRequestParamsRT,
    { startIndex: 0, endIndex: 10 },
  ],
])('%s', (_name, paramsRt, extraParams) => {
  const params = { kuery: '', from: 1000, to: 2000, ...extraParams };

  it.each(Object.values(ProfilingSchema))('accepts the %s schema', (schema) => {
    expect(isRight(paramsRt.decode({ ...params, schema }))).toBe(true);
  });

  it('accepts no schema, so the default of the profiling APIs applies', () => {
    expect(isRight(paramsRt.decode(params))).toBe(true);
  });

  it('rejects an unknown schema', () => {
    expect(isRight(paramsRt.decode({ ...params, schema: 'semconv' }))).toBe(false);
  });
});
