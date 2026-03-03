/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threatMatchStrategy, buildThreatMatchNarrative } from './threat_match_strategy';

describe('threatMatchStrategy', () => {
  describe('match', () => {
    it('returns true when rule type is threat_match', () => {
      expect(
        threatMatchStrategy.match({ kibana: { alert: { rule: { type: ['threat_match'] } } } })
      ).toBe(true);
    });

    it('returns true when threat.indicator.matched.atomic exists', () => {
      expect(
        threatMatchStrategy.match({
          threat: { indicator: { matched: { atomic: ['1.2.3.4'] } } },
        })
      ).toBe(true);
    });

    it('returns false for other rule types', () => {
      expect(
        threatMatchStrategy.match({ kibana: { alert: { rule: { type: ['query'] } } } })
      ).toBe(false);
    });
  });

  describe('buildThreatMatchNarrative', () => {
    it('builds a full threat match narrative', () => {
      const text = buildThreatMatchNarrative({
        threat: {
          indicator: {
            matched: { atomic: ['1.2.3.4'], type: ['ip'], field: ['source.ip'] },
            provider: ['AlienVault'],
          },
          feed: { name: ['OTX'] },
        },
        user: { name: ['bob'] },
        host: { name: ['server-1'] },
        kibana: { alert: { severity: ['critical'], rule: { name: ['Known C2 IP Match'] } } },
      });

      expect(text).toBe(
        'Threat indicator match (ip): 1.2.3.4 matched on field source.ip from OTX by bob on server-1 created critical alert Known C2 IP Match.'
      );
    });

    it('handles minimal threat match data', () => {
      expect(
        buildThreatMatchNarrative({
          kibana: { alert: { rule: { type: ['threat_match'], name: ['IOC Match'] } } },
        })
      ).toBe('Threat indicator match IOC Match.');
    });

    it('uses provider when feed name is absent', () => {
      expect(
        buildThreatMatchNarrative({
          threat: { indicator: { matched: { atomic: ['hash123'] }, provider: ['VirusTotal'] } },
        })
      ).toBe('Threat indicator match: hash123 from VirusTotal');
    });
  });
});
