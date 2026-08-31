/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJobIdsFilter } from './job_ids_filter';

describe('getJobIdsFilter', () => {
  it('returns an empty string when jobIds is undefined (not yet resolved)', () => {
    expect(getJobIdsFilter(undefined)).toBe('');
  });

  it('returns an empty string when jobIds is an empty array', () => {
    expect(getJobIdsFilter([])).toBe('');
  });

  it('builds a WHERE job_id IN clause for a single id', () => {
    expect(getJobIdsFilter(['security-job-01'])).toBe('| WHERE job_id IN ("security-job-01") ');
  });

  it('builds a WHERE job_id IN clause for multiple ids', () => {
    expect(getJobIdsFilter(['security-job-01', 'siem-job-02'])).toBe(
      '| WHERE job_id IN ("security-job-01", "siem-job-02") '
    );
  });

  it('escapes double quotes and backslashes in job ids', () => {
    expect(getJobIdsFilter(['weird"job', 'back\\slash'])).toBe(
      '| WHERE job_id IN ("weird\\"job", "back\\\\slash") '
    );
  });
});
