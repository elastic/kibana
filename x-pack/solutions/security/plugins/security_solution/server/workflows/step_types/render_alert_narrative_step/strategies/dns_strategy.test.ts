/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dnsStrategy, buildDnsNarrative } from './dns_strategy';

describe('dnsStrategy', () => {
  describe('match', () => {
    it('returns true when dns.question.name is present', () => {
      expect(dnsStrategy.match({ dns: { question: { name: ['evil.com'] } } })).toBe(true);
    });

    it('returns false when dns.question.name is absent', () => {
      expect(dnsStrategy.match({ event: { category: ['network'] } })).toBe(false);
    });
  });

  describe('buildDnsNarrative', () => {
    it('builds a full DNS narrative with all fields', () => {
      const text = buildDnsNarrative({
        dns: {
          question: { name: ['evil.com'], type: ['A'] },
          resolved_ip: ['1.2.3.4', '5.6.7.8'],
          response_code: ['NOERROR'],
        },
        process: { name: ['chrome'] },
        user: { name: ['alice'] },
        host: { name: ['host-1'] },
        kibana: { alert: { severity: ['high'], rule: { name: ['Suspicious DNS Query'] } } },
      });

      expect(text).toBe(
        'DNS query for evil.com (A) from process chrome by alice on host-1 resolved to 1.2.3.4, 5.6.7.8 with response NOERROR created high alert Suspicious DNS Query.'
      );
    });

    it('handles minimal DNS data', () => {
      expect(buildDnsNarrative({ dns: { question: { name: ['test.com'] } } })).toBe(
        'DNS query for test.com'
      );
    });
  });
});
