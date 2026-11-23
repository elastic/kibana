/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicatorReader } from '@kbn/significant-events-plugin/server';
import type { QueryLink, QueryType } from '@kbn/significant-events-schema';
import type { ResourceContext } from '../types';
import { getKnownFailureRuleId } from './known_failure_rule';
import { KnownFailuresStrategy } from './known_failures_strategy';

const createLink = ({
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
  links: QueryLink[],
  sources = [{ id: 'source-1', enabled: true }]
): ResourceContext =>
  ({
    spaceId: 'default',
    sources,
    cpsEnabled: false,
    knowledge: {
      listQueries: async ({ sourceIds }) =>
        links.filter(({ source_id: sourceId }) => sourceIds.includes(sourceId)),
    } as Partial<KnowledgeIndicatorReader>,
  } as unknown as ResourceContext);

describe('KnownFailuresStrategy', () => {
  describe('resources', () => {
    it('wants one change point rule per countable match knowledge indicator', async () => {
      const { resources, skipped } = await new KnownFailuresStrategy().resources(
        createContext([createLink()])
      );

      expect(skipped).toEqual([]);
      expect(resources).toEqual([
        {
          kind: 'alerting_rule',
          source_id: 'source-1',
          enabled: true,
          data: expect.objectContaining({
            kind: 'signal',
            metadata: { name: 'Checkout timeouts' },
            query: {
              base: expect.stringMatching(
                /^FROM logs-\* \| WHERE service\.name == "checkout" AND message : "timeout"\n\| WHERE @timestamp >= .*CHANGE_POINT metric_value ON bucket/s
              ),
            },
          }),
        },
      ]);
    });

    // Noted, not skipped: a skipped source keeps all its rules, so the old rule of an edited
    // indicator beside a STATS one would never be deleted.
    it('notes STATS, non-filter, SET, subquery and overlong knowledge indicators without skipping their source', async () => {
      const { resources, skipped, notes } = await new KnownFailuresStrategy().resources(
        createContext([
          createLink({ id: 'stats', type: 'stats' }),
          createLink({ id: 'sorted', esql: 'FROM logs-* | WHERE a == 1 | SORT b' }),
          createLink({ id: 'set', esql: 'SET a = 1; FROM logs-* | WHERE a == 1' }),
          createLink({
            id: 'subquery',
            esql: 'FROM logs-*, (FROM other | STATS c = COUNT(*)) | WHERE a == 1',
          }),
          createLink({
            id: 'long',
            esql: `FROM logs-* | WHERE message == "${'a'.repeat(9_500)}"`,
          }),
        ])
      );

      expect(resources).toEqual([]);
      expect(skipped).toEqual([]);
      expect(notes).toEqual([
        expect.stringMatching(/^source-1: .*\[stats\]/),
        expect.stringMatching(/^source-1: .*\[sorted\]/),
        expect.stringMatching(/^source-1: .*\[set\]/),
        expect.stringMatching(/^source-1: .*\[subquery\]/),
        expect.stringMatching(/^source-1: .*\[long\] is too long/),
      ]);
    });

    it('keeps the rule of a disabled source, turned off', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([createLink()], [{ id: 'source-1', enabled: false }])
      );

      expect(resources).toEqual([expect.objectContaining({ enabled: false })]);
    });

    it('routes the rule across projects when cross-project search is on', async () => {
      const { resources } = await new KnownFailuresStrategy().resources({
        ...createContext([createLink()]),
        cpsEnabled: true,
      });

      expect(resources[0].data.query.base).toMatch(/^SET project_routing="[^"]+";\nFROM logs-\*/);
    });
  });

  // The generator finds a rule's rows by recomputing its id, so any input the rule depends on must
  // move it, and nothing else may.
  describe('getKnownFailureRuleId', () => {
    const getId = (overrides: Parameters<typeof createLink>[0], cpsEnabled = false) =>
      getKnownFailureRuleId({ spaceId: 'default', link: createLink(overrides), cpsEnabled });

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
});
