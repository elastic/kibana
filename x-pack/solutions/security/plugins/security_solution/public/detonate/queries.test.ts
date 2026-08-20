/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetonationQueryFilters } from './queries';
import {
  getDetonationsQuery,
  getPlatformCountsQuery,
  getProtectionCountsQuery,
  getRuleNameCountsQuery,
  getSourceCountsQuery,
} from './queries';

const NO_FILTERS: DetonationQueryFilters = {
  onlyWithAlerts: true,
  hash: '',
  protections: [],
  platforms: [],
  sources: [],
  familyRuleNames: null,
};

const queryFor = (overrides: Partial<DetonationQueryFilters> = {}) =>
  getDetonationsQuery({ ...NO_FILTERS, ...overrides });

describe('getDetonationsQuery', () => {
  it('adds no filter clauses when nothing is selected', () => {
    const query = queryFor();

    expect(query).not.toContain('MV_CONTAINS');
    expect(query).not.toContain('LIKE');
    expect(query).not.toContain(' IN (');
  });

  it('drops the alert clause when undetected detonations are wanted', () => {
    expect(queryFor({ onlyWithAlerts: false })).not.toContain('endpointAlertsCount > 0');
  });

  describe('hash', () => {
    it('searches case-insensitively for a partial hash', () => {
      expect(queryFor({ hash: '75A0D2B3' })).toContain(
        'TO_LOWER(task.sample_hash.keyword) LIKE "*75a0d2b3*"'
      );
    });

    it('ignores surrounding whitespace', () => {
      expect(queryFor({ hash: '  75a0d2b3  ' })).toContain('LIKE "*75a0d2b3*"');
    });

    it('matches nothing when the search contains no hex at all', () => {
      const query = queryFor({ hash: 'zzz!' });

      expect(query).toContain('| WHERE false');
      expect(query).not.toContain('LIKE');
    });

    it('picks the hash out of a prefix whose own digits are hex', () => {
      expect(queryFor({ hash: 'sha256:75a0d2b3' })).toContain('LIKE "*75a0d2b3*"');
    });

    it('strips wildcards rather than letting them widen the pattern', () => {
      expect(queryFor({ hash: '*' })).toContain('| WHERE false');
      expect(queryFor({ hash: 'ab*' })).toContain('LIKE "*ab*"');
    });
  });

  describe('multivalue fields', () => {
    it('uses MV_CONTAINS for protections, since == under-matches a multivalue', () => {
      const query = queryFor({ protections: ['behavior'] });

      expect(query).toContain(
        'MV_CONTAINS(task.production_endpoint_alert_groups.event_code.keyword, "behavior")'
      );
    });

    it('ORs the selections within one filter', () => {
      const query = queryFor({ protections: ['behavior', 'ransomware'] });

      expect(query).toContain('"behavior") OR MV_CONTAINS');
      expect(query).toContain('"ransomware")');
    });

    it('matches a family through every rule name that names it', () => {
      const query = queryFor({
        familyRuleNames: ['Windows.Trojan.Vidar', 'Linux.Trojan.Vidar'],
      });

      expect(query).toContain(
        'MV_CONTAINS(task.production_endpoint_alert_groups.rule_name.keyword, "Windows.Trojan.Vidar")'
      );
      expect(query).toContain('"Linux.Trojan.Vidar")');
    });

    it('matches nothing while a family selection is still unresolved', () => {
      expect(queryFor({ familyRuleNames: [] })).toContain('| WHERE false');
    });
  });

  describe('single-valued fields', () => {
    it('uses IN for platform and source', () => {
      const query = queryFor({ platforms: ['windows', 'darwin'], sources: ['virtustotal'] });

      expect(query).toContain('task.vm_os_family.keyword IN ("windows", "darwin")');
      expect(query).toContain('task.sample_source.keyword IN ("virtustotal")');
    });
  });

  it('ANDs the filters by emitting one clause each', () => {
    const clauses = (query: string) => (query.match(/\| WHERE /g) ?? []).length;

    const query = queryFor({
      hash: 'abc',
      protections: ['behavior'],
      platforms: ['windows'],
      sources: ['virtustotal'],
    });

    expect(clauses(query)).toEqual(clauses(queryFor()) + 4);
  });

  it('escapes quotes and backslashes so a value cannot break out of its literal', () => {
    const query = queryFor({ sources: ['a"b\\c'] });

    expect(query).toContain('IN ("a\\"b\\\\c")');
  });
});

describe('breakdown queries', () => {
  const breakdowns = [
    {
      name: 'protections',
      build: getProtectionCountsQuery,
      ownFilter: { protections: ['behavior'] },
      ownClause: 'event_code.keyword, "behavior"',
    },
    {
      name: 'platform',
      build: getPlatformCountsQuery,
      ownFilter: { platforms: ['windows'] },
      ownClause: 'task.vm_os_family.keyword IN',
    },
    {
      name: 'source',
      build: getSourceCountsQuery,
      ownFilter: { sources: ['virustotal'] },
      ownClause: 'task.sample_source.keyword IN',
    },
    {
      name: 'families',
      build: getRuleNameCountsQuery,
      ownFilter: { familyRuleNames: ['Windows.Trojan.Vidar'] },
      ownClause: 'rule_name.keyword, "Windows.Trojan.Vidar"',
    },
  ];

  it.each(breakdowns)(
    'the $name breakdown leaves out its own filter, so its bars keep offering the other values',
    ({ build, ownFilter, ownClause }) => {
      expect(build({ ...NO_FILTERS, ...ownFilter })).not.toContain(ownClause);
    }
  );

  it.each(breakdowns)(
    'the $name breakdown applies the filters it does not group by',
    ({ build }) => {
      expect(build({ ...NO_FILTERS, hash: '75a0d2b3' })).toContain('LIKE "*75a0d2b3*"');
    }
  );

  it.each(breakdowns)('the $name breakdown follows the detected-only toggle', ({ build }) => {
    expect(build(NO_FILTERS)).toContain('endpointAlertsCount > 0');
    expect(build({ ...NO_FILTERS, onlyWithAlerts: false })).not.toContain(
      'endpointAlertsCount > 0'
    );
  });

  it('narrows one breakdown by another breakdown filter', () => {
    expect(getPlatformCountsQuery({ ...NO_FILTERS, protections: ['ransomware'] })).toContain(
      'MV_CONTAINS(task.production_endpoint_alert_groups.event_code.keyword, "ransomware")'
    );
  });

  it('leaves the families breakdown showing every family while only named threats are wanted', () => {
    const namedThreats = { ...NO_FILTERS, familyRuleNames: ['Windows.Trojan.Vidar'] };

    expect(getRuleNameCountsQuery(namedThreats)).toEqual(getRuleNameCountsQuery(NO_FILTERS));
  });
});
