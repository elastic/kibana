/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}: {
  id?: string;
  sourceId?: string;
  title?: string;
  esql?: string;
  type?: QueryType;
} = {}): QueryLink => ({
  query: { id, title, description: 'Checkout calls time out', esql: { query: esql }, type },
  source_id: sourceId,
  rule_backed: false,
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
  } as unknown as ResourceContext);

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
    it('counts a knowledge indicator with KEEP, DROP or SORT on its filters alone', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([
          createQuery({
            esql: 'FROM logs-* | KEEP message | WHERE message : "timeout" | DROP a | SORT message',
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

    // Noted, not skipped: a skipped source keeps all its rules, so the old rule of an edited
    // indicator beside a STATS one would never be deleted.
    it('notes STATS, non-filter, SET, subquery, self-timed, parameterized and overlong knowledge indicators without skipping their source', async () => {
      const { resources, skipped, notes } = await new KnownFailuresStrategy().resources(
        createContext([
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
        expect.stringMatching(/^source-1: .*\[stats\]/),
        expect.stringMatching(/^source-1: .*\[limited\]/),
        expect.stringMatching(/^source-1: .*\[unfiltered\]/),
        expect.stringMatching(/^source-1: .*\[set\]/),
        expect.stringMatching(/^source-1: .*\[subquery\]/),
        expect.stringMatching(/^source-1: .*\[now\]/),
        expect.stringMatching(/^source-1: .*\[param\]/),
        expect.stringMatching(/^source-1: .*\[long\] is too long/),
      ]);
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

  it('changes with the query, the source and the routing', () => {
    const id = getId({});

    expect(getId({ esql: 'FROM logs-* | WHERE message : "refused"' })).not.toBe(id);
    expect(getId({ sourceId: 'source-2' })).not.toBe(id);
    expect(getId({}, true)).not.toBe(id);
  });

  it('keeps the id when only the title changes', () => {
    expect(getId({ title: 'Renamed' })).toBe(getId({}));
  });
});
