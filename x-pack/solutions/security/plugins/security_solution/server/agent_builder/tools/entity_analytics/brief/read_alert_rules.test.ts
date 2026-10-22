/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BriefCandidate } from './types';
import {
  buildAlertsFilter,
  buildRulesAggregation,
  readAlertRules,
  toAlertsByCandidateId,
} from './read_alert_rules';

const bucket = (count: number, rules: Array<[string, number]>, ruleCount = rules.length) => ({
  doc_count: count,
  ruleCount: { value: ruleCount },
  rules: { buckets: rules.map(([key, docCount]) => ({ key, doc_count: docCount })) },
});

describe('toAlertsByCandidateId', () => {
  it.each([
    ['no aggregations, as when the alerts index is missing', undefined, {}],
    [
      'the rules of each candidate, and no entry for a candidate without alerts',
      {
        byCandidate: {
          buckets: {
            'user:a': bucket(
              9,
              [
                ['Credential Dump', 4],
                ['Odd Logon', 3],
              ],
              5
            ),
            'host:b': bucket(0, []),
          },
        },
      },
      {
        'user:a': {
          count: 9,
          ruleCount: 5,
          otherRuleCount: 3,
          rules: [
            { index: 1, name: 'Credential Dump', count: 4 },
            { index: 2, name: 'Odd Logon', count: 3 },
          ],
        },
      },
    ],
    [
      'a long rule name cut short',
      { byCandidate: { buckets: { 'user:a': bucket(1, [['x'.repeat(300), 1]]) } } },
      {
        'user:a': {
          count: 1,
          ruleCount: 1,
          otherRuleCount: 0,
          rules: [{ index: 1, name: `${'x'.repeat(97)}...`, count: 1 }],
        },
      },
    ],
  ])('returns %s', (_description, aggregations, expected) => {
    expect(toAlertsByCandidateId(aggregations)).toEqual(expected);
  });
});

describe('buildAlertsFilter', () => {
  const candidate = (record: BriefCandidate['record'], members?: BriefCandidate['members']) => ({
    id: 'host:web-01',
    name: 'web-01',
    type: 'host' as const,
    tileIds: [],
    record,
    members,
  });
  /** The two ways an alert is matched: stamped with an id, or without a stamp by identity fields. */
  const getBranches = (record: BriefCandidate['record'], members?: BriefCandidate['members']) =>
    JSON.stringify(buildAlertsFilter(candidate(record, members)).bool.should);

  it('matches a stamped alert on the ids of the candidate and its members', () => {
    expect(
      getBranches({ host: { name: 'web-01' } }, [{ id: 'host:web-02', record: {} }])
    ).toContain('{"terms":{"kibana.alert.entity.id":["host:web-01","host:web-02"]}}');
  });

  it('matches an unstamped alert by the identity fields of a record that has them, and not otherwise', () => {
    const withIdentity = getBranches({ host: { name: 'web-01' } });
    expect(withIdentity).toContain('{"term":{"host.name":"web-01"}}');
    expect(withIdentity).toContain('"must_not":[{"exists":{"field":"kibana.alert.entity.id"}}]');
    expect(getBranches({})).toContain('"should":[]');
  });
});

describe('buildAlertsFilter with a large group', () => {
  it('matches the ids of every member of a stamped alert, and the records of the first 20 only', () => {
    const members = Array.from({ length: 21 }, (_, index) => ({
      id: `host:member-${index}`,
      record: { host: { name: `member-${index}` } },
    }));
    const filter = JSON.stringify(
      buildAlertsFilter({
        id: 'host:web-01',
        name: 'web-01',
        type: 'host',
        tileIds: [],
        record: { host: { name: 'web-01' } },
        members,
      }).bool.should
    );

    expect(filter).toContain('"host:member-20"');
    expect(filter).toContain('"host.name":"member-19"');
    expect(filter).not.toContain('"host.name":"member-20"');
  });
});

describe('readAlertRules', () => {
  it('reports a failed read as no rules, never as an error', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('no privileges')),
    } as unknown as ElasticsearchClient;
    const logger = { debug: jest.fn() } as unknown as Logger;

    await expect(
      readAlertRules({
        candidates: [{ id: 'host:web-01', name: 'web-01', type: 'host', tileIds: [], record: {} }],
        scope: { period: '7d', capturedAt: '2026-10-14T12:00:00.000Z', tiles: {} },
        spaceId: 'default',
        esClient,
        logger,
      })
    ).resolves.toEqual({ alertsByEntityId: {}, isFailed: true });
  });
});

describe('buildRulesAggregation', () => {
  it('takes the two rules whose alerts have the highest risk score, then the most alerts', () => {
    const { terms, aggs } = buildRulesAggregation();

    expect(terms.size).toBe(2);
    expect(terms.order).toEqual([{ highestRiskScore: 'desc' }, { _count: 'desc' }]);
    expect(aggs.highestRiskScore.max.field).toBe('kibana.alert.risk_score');
  });
});
