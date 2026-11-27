/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { KnowledgeIndicatorReader } from '@kbn/significant-events-plugin/server';
import type { QueryLink, QueryType } from '@kbn/significant-events-schema';
import { computeRuleId } from '../../rules/rule_identity';
import type { ResourceContext } from '../types';
import { getKnownFailureRuleId } from './known_failure_rule';
import { KnownFailuresStrategy } from './known_failures_strategy';

const createQuery = ({
  id = 'ki-1',
  sourceId = 'source-1',
  title = 'Checkout timeouts',
  esql = 'FROM logs-* | WHERE service.name == "checkout" AND message : "timeout"',
  type = 'match',
  // The lowest score significant events backs with a rule, so the default fixture sits on the edge.
  severityScore = 60,
  isRuleBacked = false,
}: {
  id?: string;
  sourceId?: string;
  title?: string;
  esql?: string;
  type?: QueryType;
  severityScore?: number;
  isRuleBacked?: boolean;
} = {}): QueryLink => ({
  query: {
    id,
    title,
    description: 'Checkout calls time out',
    esql: { query: esql },
    type,
    severity_score: severityScore,
  },
  source_id: sourceId,
  rule_backed: isRuleBacked,
  rule_id: `rule-${id}`,
});

const createContext = (
  queries: QueryLink[],
  sources = [{ id: 'source-1', enabled: true }]
): ResourceContext =>
  ({
    spaceId: 'default',
    sources,
    cpsEnabled: false,
    knowledge: {
      listQueries: async ({ sourceIds }) =>
        queries.filter(({ source_id: sourceId }) => sourceIds.includes(sourceId)),
    } as Partial<KnowledgeIndicatorReader>,
  }) as unknown as ResourceContext;

describe('KnownFailuresStrategy', () => {
  describe('resources', () => {
    it('wants one measuring rule per countable match knowledge indicator', async () => {
      const { resources, skipped } = await new KnownFailuresStrategy().resources(
        createContext([createQuery()])
      );

      expect(skipped).toEqual([]);
      expect(resources).toEqual([
        {
          kind: 'alerting_rule',
          source_id: 'source-1',
          enabled: true,
          data: expect.objectContaining({
            kind: 'signal',
            metadata: {
              name: 'Checkout timeouts',
              description: expect.stringMatching(/^Measures how often knowledge indicator ki-1 /),
            },
            query: {
              base: expect.stringMatching(
                /\nFROM logs-\*\n\| WHERE service\.name == "checkout" AND message : "timeout"\n.*\| WHERE @timestamp >= .*CHANGE_POINT count ON minute/s
              ),
            },
          }),
        },
      ]);
    });

    // Dropped, not refused: they leave the matched lines unchanged, and KEEP could drop @timestamp.
    // An @timestamp in them is no time bound of the indicator's own, since the rule drops them.
    it('counts a knowledge indicator with KEEP, DROP or SORT on its filters alone', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([
          createQuery({
            esql: 'FROM logs-* | KEEP @timestamp, message | WHERE message : "timeout" | DROP a | SORT @timestamp DESC',
          }),
        ])
      );

      expect(resources[0].data.query.base).toMatch(
        /\nFROM logs-\*\n\| WHERE message : "timeout"\n\/\/ [^\n]*\n\| WHERE @timestamp >= /
      );
    });

    // The parser counts positions in code points and strings in UTF-16 units: cut wrong, the
    // condition silently loses its end and the rule counts other lines.
    it('keeps a condition whole when the knowledge indicator quotes an emoji', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([
          createQuery({ esql: 'FROM logs-* | WHERE message : "🔥 failed" AND code == 12' }),
        ])
      );

      expect(resources[0].data.query.base).toMatch(
        /\nFROM logs-\*\n\| WHERE message : "🔥 failed" AND code == 12\n/
      );
    });

    // A knowledge indicator id is any string; unquoted, a line break in it would end the comment
    // naming it and run the rest as ES|QL.
    it('keeps a line break in the knowledge indicator id out of the rule query', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([createQuery({ id: 'ki-1\n| LIMIT 0' })])
      );

      expect(resources[0].data.query.base).not.toMatch(/^\| LIMIT 0/m);
    });

    // Noted, not skipped: a skipped source keeps all its rules, so the old rule of an edited
    // indicator beside a STATS one would never be deleted. The note is the only place an author
    // learns why, so it names the actual reason.
    it('notes STATS, non-filter, SET, subquery, self-timed, parameterized, overlong and low-severity knowledge indicators without skipping their source', async () => {
      const { resources, skipped, notes } = await new KnownFailuresStrategy().resources(
        createContext([
          // Below the score significant events needs to back a query with a rule.
          createQuery({ id: 'medium', severityScore: 59 }),
          {
            ...createQuery({ id: 'unscored' }),
            query: omit(createQuery({ id: 'unscored' }).query, 'severity_score'),
          },
          createQuery({ id: 'stats', type: 'stats' }),
          createQuery({ id: 'limited', esql: 'FROM logs-* | WHERE a == 1 | LIMIT 10' }),
          createQuery({ id: 'unfiltered', esql: 'FROM logs-* | SORT message' }),
          createQuery({ id: 'set', esql: 'SET a = 1; FROM logs-* | WHERE a == 1' }),
          createQuery({
            id: 'subquery',
            esql: 'FROM logs-*, (FROM other | STATS c = COUNT(*)) | WHERE a == 1',
          }),
          // Minutes outside its own time bound would count as zeros; the rule binds no parameters.
          createQuery({
            id: 'now',
            esql: 'FROM logs-* | WHERE a == 1 AND @timestamp > NOW() - 1h',
          }),
          createQuery({ id: 'param', esql: 'FROM logs-* | WHERE a == ?value' }),
          createQuery({
            id: 'long',
            esql: `FROM logs-* | WHERE message == "${'a'.repeat(9_500)}"`,
          }),
        ])
      );

      expect(resources).toEqual([]);
      expect(skipped).toEqual([]);
      expect(notes).toEqual([
        expect.stringMatching(
          /^source-1: .*\[medium\] has a severity score of 59 and no rule; .* from 60/
        ),
        expect.stringMatching(/^source-1: .*\[unscored\] has no severity score/),
        expect.stringMatching(/^source-1: .*\[stats\] is a STATS query/),
        expect.stringMatching(/^source-1: .*\[limited\] uses LIMIT/),
        expect.stringMatching(/^source-1: .*\[unfiltered\] has no WHERE/),
        expect.stringMatching(/^source-1: .*\[set\] starts with a SET header/),
        expect.stringMatching(/^source-1: .*\[subquery\] reads from a subquery/),
        expect.stringMatching(/^source-1: .*\[now\] bounds its own time/),
        expect.stringMatching(/^source-1: .*\[param\] uses \? parameters/),
        expect.stringMatching(/^source-1: .*\[long\] is too long/),
      ]);
    });

    // Significant events lets an operator promote any match indicator by hand, whatever its score.
    it('watches a lower-scored knowledge indicator promoted to a rule', async () => {
      const { resources, notes } = await new KnownFailuresStrategy().resources(
        createContext([createQuery({ severityScore: 59, isRuleBacked: true })])
      );

      expect(resources).toHaveLength(1);
      expect(notes).toEqual([]);
    });

    it('keeps the rule of a disabled source, turned off', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([createQuery()], [{ id: 'source-1', enabled: false }])
      );

      expect(resources).toEqual([expect.objectContaining({ enabled: false })]);
    });

    it('routes the rule across projects when cross-project search is on', async () => {
      const { resources } = await new KnownFailuresStrategy().resources({
        ...createContext([createQuery()]),
        cpsEnabled: true,
      });

      expect(resources[0].data.query.base).toMatch(/^SET project_routing="[^"]+";\n/);
    });
  });
});

// The generator finds a rule's rows by recomputing its id, so any input the rule depends on must
// move it, and nothing else may.
describe('getKnownFailureRuleId', () => {
  const getId = (overrides: Parameters<typeof createQuery>[0], cpsEnabled = false) =>
    getKnownFailureRuleId({ spaceId: 'default', query: createQuery(overrides), cpsEnabled });

  // Different ids mean the generator reads no rows at all, and nothing says so.
  it('is the id the reconciler gives the rule the strategy wants', async () => {
    const strategy = new KnownFailuresStrategy();
    const {
      resources: [resource],
    } = await strategy.resources(createContext([createQuery()]));

    expect(
      computeRuleId({
        spaceId: 'default',
        strategy: strategy.descriptor.id,
        sourceId: resource.source_id,
        data: resource.data,
      })
    ).toBe(getId({}));
  });

  // Two indicators sharing one rule would leave one of them unwatched, its rows read as the other's.
  it('changes with the knowledge indicator, the query, the source and the routing', () => {
    const id = getId({});

    expect(getId({ id: 'ki-2' })).not.toBe(id);
    expect(getId({ esql: 'FROM logs-* | WHERE message : "refused"' })).not.toBe(id);
    expect(getId({ sourceId: 'source-2' })).not.toBe(id);
    expect(getId({}, true)).not.toBe(id);
  });

  it('keeps the id when only the title changes', () => {
    expect(getId({ title: 'Renamed' })).toBe(getId({}));
  });
});
