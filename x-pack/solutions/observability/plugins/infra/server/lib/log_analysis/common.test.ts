/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { resolveJobProjectRouting } from './common';

const cpsServerless = { isServerless: true, cpsEnabled: true };

const createMlJob = (datafeedConfig?: Record<string, unknown>): estypes.MlJob =>
  ({
    job_id: 'test-job',
    ...(datafeedConfig ? { datafeed_config: datafeedConfig } : {}),
  } as unknown as estypes.MlJob);

describe('resolveJobProjectRouting', () => {
  it('returns the stored project routing when the datafeed has one', () => {
    expect(
      resolveJobProjectRouting(createMlJob({ project_routing: '_alias:_origin' }), cpsServerless)
    ).toBe('_alias:_origin');
  });

  it('falls back to all projects for unscoped datafeeds with a cloud API key', () => {
    expect(
      resolveJobProjectRouting(
        createMlJob({ authorization: { cloud_api_key: { id: 'key-id' } } }),
        cpsServerless
      )
    ).toBe('_alias:*');
  });

  it('falls back to the origin project for unscoped datafeeds without a cloud API key', () => {
    expect(resolveJobProjectRouting(createMlJob({}), cpsServerless)).toBe('_alias:_origin');
  });

  it('returns undefined for jobs without a datafeed', () => {
    expect(resolveJobProjectRouting(createMlJob(), cpsServerless)).toBeUndefined();
  });

  it('returns undefined when CPS is disabled', () => {
    expect(
      resolveJobProjectRouting(createMlJob({ project_routing: '_alias:_origin' }), {
        isServerless: true,
        cpsEnabled: false,
      })
    ).toBeUndefined();
  });

  it('returns undefined outside serverless', () => {
    expect(
      resolveJobProjectRouting(createMlJob({ project_routing: '_alias:_origin' }), {
        isServerless: false,
        cpsEnabled: false,
      })
    ).toBeUndefined();
  });
});
