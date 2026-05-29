/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIRST_PARTY,
  THIRD_PARTY,
  SEC_FETCH_SITE_FIELD,
  FIRST_PARTY_SEC_FETCH_VALUES,
  THIRD_PARTY_SEC_FETCH_VALUES,
  PARTY_RUNTIME_MAPPINGS,
  partyQuery,
} from './get_certs_request_body';

describe('origin (party) query helpers', () => {
  it('declares a no-script keyword runtime field over the Sec-Fetch-Site header', () => {
    // Request headers are not indexed; the field must be read from `_source`.
    expect(PARTY_RUNTIME_MAPPINGS).toEqual({
      [SEC_FETCH_SITE_FIELD]: { type: 'keyword' },
    });
    expect(SEC_FETCH_SITE_FIELD).toBe('http.request.headers.sec_fetch_site');
  });

  it('maps same-origin / same-site / none to first-party and cross-site to third-party', () => {
    expect(partyQuery(FIRST_PARTY)).toEqual({
      terms: { [SEC_FETCH_SITE_FIELD]: ['same-origin', 'same-site', 'none'] },
    });
    expect(partyQuery(THIRD_PARTY)).toEqual({
      terms: { [SEC_FETCH_SITE_FIELD]: ['cross-site'] },
    });
  });

  it('keeps the two origin buckets disjoint', () => {
    const overlap = FIRST_PARTY_SEC_FETCH_VALUES.filter((value) =>
      (THIRD_PARTY_SEC_FETCH_VALUES as readonly string[]).includes(value)
    );
    expect(overlap).toEqual([]);
    // `cross-site` is the only third-party signal.
    expect(THIRD_PARTY_SEC_FETCH_VALUES).toEqual(['cross-site']);
  });
});
