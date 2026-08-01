/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEntityCandidates } from '.';

const bucket = (key: string, source?: Record<string, unknown>) => ({
  key,
  doc_count: 1,
  sample: { hits: { hits: [{ _source: source }] } },
});

describe('extractEntityCandidates', () => {
  it('returns an empty array when aggregations are undefined', () => {
    expect(extractEntityCandidates(undefined)).toEqual([]);
  });

  it('returns an empty array when no known aggregations are present', () => {
    expect(extractEntityCandidates({ some_other_agg: { buckets: [] } })).toEqual([]);
  });

  it('extracts user, host, and service candidates with their sample sources', () => {
    const userSource = { user: { name: 'jdoe' } };
    const hostSource = { host: { name: 'web-01' } };
    const serviceSource = { service: { name: 'nginx' } };

    const candidates = extractEntityCandidates({
      unique_users_by_euid: { buckets: [bucket('user:jdoe', userSource)] },
      unique_hosts_by_euid: { buckets: [bucket('host:web-01', hostSource)] },
      unique_services_by_euid: { buckets: [bucket('service:nginx', serviceSource)] },
    });

    expect(candidates).toEqual([
      { entityType: 'user', euid: 'user:jdoe', sampleSource: userSource },
      { entityType: 'host', euid: 'host:web-01', sampleSource: hostSource },
      { entityType: 'service', euid: 'service:nginx', sampleSource: serviceSource },
    ]);
  });

  it('falls back to an empty sample source when top_hits has no _source', () => {
    const candidates = extractEntityCandidates({
      unique_users_by_euid: {
        buckets: [{ key: 'user:jdoe', doc_count: 1 }],
      },
    });

    expect(candidates).toEqual([{ entityType: 'user', euid: 'user:jdoe', sampleSource: {} }]);
  });

  it('skips buckets with empty or non-string keys', () => {
    const candidates = extractEntityCandidates({
      unique_users_by_euid: {
        buckets: [bucket(''), { key: 42 as unknown as string, doc_count: 1 }],
      },
    });

    expect(candidates).toEqual([]);
  });

  it('extracts multiple buckets for the same entity type', () => {
    const candidates = extractEntityCandidates({
      unique_hosts_by_euid: {
        buckets: [bucket('host:web-01'), bucket('host:web-02')],
      },
    });

    expect(candidates.map(({ euid }) => euid)).toEqual(['host:web-01', 'host:web-02']);
  });
});
