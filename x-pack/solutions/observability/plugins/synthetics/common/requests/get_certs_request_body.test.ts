/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { GetCertsParams } from '../runtime_types';
import { FINAL_SUMMARY_FILTER } from '../constants/client_defaults';
import {
  getCertsRequestBody,
  BROWSER_NETWORK_INFO,
  CERT_HASH_SHA256,
  CERT_ISSUER_COMMON_NAME,
  CERT_SUBJECT_COMMON_NAME,
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

describe('getCertsRequestBody', () => {
  // Representative params for the recurring TLS alert-rule query (see
  // tls_rule_executor.ts). The rule shares this builder with the certificates
  // page but deliberately leaves `includeBrowserCerts` off to keep its query
  // lean; these tests lock that contract so a future page-side change cannot
  // leak browser-cert machinery into the rule's hot path.
  const ruleParams: GetCertsParams = {
    pageIndex: 0,
    size: 1000,
    sortBy: 'common_name',
    direction: 'desc',
    notValidAfter: 'now+30d',
    notValidBefore: 'now-730d',
    monitorIds: ['monitor-1', 'monitor-2'],
  };

  describe('TLS alert-rule (lean) path', () => {
    it('collapses on the sha256 fingerprint', () => {
      const body = getCertsRequestBody(ruleParams) as estypes.SearchRequest;
      expect(body.collapse?.field).toBe(CERT_HASH_SHA256);
      expect(body.aggs?.total).toEqual({ cardinality: { field: CERT_HASH_SHA256 } });
    });

    it('keeps a single-key sort with no browser-cert tiebreaker', () => {
      const body = getCertsRequestBody(ruleParams) as estypes.SearchRequest;
      expect(body.sort).toEqual([{ [CERT_SUBJECT_COMMON_NAME]: { order: 'desc' } }]);
    });

    it('requests only the distinct-cert total aggregation', () => {
      const body = getCertsRequestBody(ruleParams) as estypes.SearchRequest;
      expect(Object.keys(body.aggs ?? {})).toEqual(['total']);
    });

    it('declares no runtime fields and never reads browser/origin data', () => {
      const body = getCertsRequestBody(ruleParams) as estypes.SearchRequest;
      expect(body.runtime_mappings).toBeUndefined();
      // No browser network-event branch and no Sec-Fetch-Site origin field may
      // leak anywhere into the recurring rule query.
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(BROWSER_NETWORK_INFO);
      expect(serialized).not.toContain(SEC_FETCH_SITE_FIELD);
    });

    it('matches only certificate-bearing lightweight summary pings', () => {
      const body = getCertsRequestBody(ruleParams) as estypes.SearchRequest;
      const filter = body.query?.bool?.filter as estypes.QueryDslQueryContainer[];
      expect(filter).toEqual(
        expect.arrayContaining([FINAL_SUMMARY_FILTER, { exists: { field: CERT_HASH_SHA256 } }])
      );
      // Without a search term the query carries no should/minimum_should_match.
      expect(body.query?.bool?.should).toBeUndefined();
    });
  });

  describe('certificates page path (includeBrowserCerts)', () => {
    it('collapses on the subject common name and adds the fingerprint tiebreaker', () => {
      const body = getCertsRequestBody({
        ...ruleParams,
        includeBrowserCerts: true,
      }) as estypes.SearchRequest;
      expect(body.collapse?.field).toBe(CERT_SUBJECT_COMMON_NAME);
      expect(body.sort).toEqual([
        { [CERT_SUBJECT_COMMON_NAME]: { order: 'desc' } },
        { [CERT_HASH_SHA256]: { order: 'asc', missing: '_last' } },
      ]);
    });

    it('declares the origin runtime field only when the party filter is active', () => {
      const withoutParty = getCertsRequestBody({
        ...ruleParams,
        includeBrowserCerts: true,
      }) as estypes.SearchRequest;
      expect(withoutParty.runtime_mappings).toBeUndefined();

      const withParty = getCertsRequestBody({
        ...ruleParams,
        includeBrowserCerts: true,
        party: [FIRST_PARTY],
      }) as estypes.SearchRequest;
      expect(withParty.runtime_mappings).toEqual(PARTY_RUNTIME_MAPPINGS);
    });

    it('requests only the distinct-cert total aggregation (summary counts come from the facets endpoint)', () => {
      const body = getCertsRequestBody({
        ...ruleParams,
        includeBrowserCerts: true,
      }) as estypes.SearchRequest;
      expect(Object.keys(body.aggs ?? {})).toEqual(['total']);
    });

    it('adds an issuer (certificate authority) terms filter only when issuers is set', () => {
      const issuerTerms = (body: estypes.SearchRequest) => {
        const filter = (body.query?.bool?.filter ?? []) as estypes.QueryDslQueryContainer[];
        return filter.find((clause) => {
          const terms = clause?.terms;
          return terms != null && CERT_ISSUER_COMMON_NAME in terms;
        });
      };

      const withoutIssuer = getCertsRequestBody({
        ...ruleParams,
        includeBrowserCerts: true,
      }) as estypes.SearchRequest;
      expect(issuerTerms(withoutIssuer)).toBeUndefined();

      const withIssuer = getCertsRequestBody({
        ...ruleParams,
        includeBrowserCerts: true,
        issuers: ["Let's Encrypt", 'DigiCert'],
      }) as estypes.SearchRequest;
      expect(issuerTerms(withIssuer)).toEqual({
        terms: { [CERT_ISSUER_COMMON_NAME]: ["Let's Encrypt", 'DigiCert'] },
      });
    });
  });
});
