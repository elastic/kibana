/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KnowledgeIndicatorReader,
  QueryKnowledgeIndicator,
} from '@kbn/significant-events-plugin/server';
import type { ResourceContext } from '../types';
import { getKnownFailureRuleId } from './known_failure_rule';
import { KnownFailuresStrategy } from './known_failures_strategy';

const createKnowledgeIndicator = (
  overrides: Partial<QueryKnowledgeIndicator> = {}
): QueryKnowledgeIndicator => ({
  id: 'ki-1',
  source_id: 'source-1',
  source_enabled: true,
  title: 'Checkout timeouts',
  description: 'Checkout calls time out',
  esql: 'FROM logs-* | WHERE service.name == "checkout" AND message : "timeout"',
  query_type: 'match',
  feature_ids: [],
  ...overrides,
});

const createContext = (knowledgeIndicators: QueryKnowledgeIndicator[]): ResourceContext =>
  ({
    spaceId: 'default',
    cpsEnabled: false,
    knowledge: {
      listQueryKnowledgeIndicators: async () => knowledgeIndicators,
    } as Partial<KnowledgeIndicatorReader>,
  } as unknown as ResourceContext);

describe('KnownFailuresStrategy', () => {
  describe('resources', () => {
    it('wants one change point rule per countable match knowledge indicator', async () => {
      const { resources, skipped } = await new KnownFailuresStrategy().resources(
        createContext([createKnowledgeIndicator()])
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

    it('skips STATS knowledge indicators and queries that are more than FROM and WHERE', async () => {
      const { resources, skipped } = await new KnownFailuresStrategy().resources(
        createContext([
          createKnowledgeIndicator({ id: 'stats', query_type: 'stats' }),
          createKnowledgeIndicator({ id: 'sorted', esql: 'FROM logs-* | WHERE a == 1 | SORT b' }),
        ])
      );

      expect(resources).toEqual([]);
      expect(skipped).toEqual([
        { source_id: 'source-1', reason: expect.stringContaining('[stats]') },
        { source_id: 'source-1', reason: expect.stringContaining('[sorted]') },
      ]);
    });

    it('keeps the rule of a disabled source, turned off', async () => {
      const { resources } = await new KnownFailuresStrategy().resources(
        createContext([createKnowledgeIndicator({ source_enabled: false })])
      );

      expect(resources).toEqual([expect.objectContaining({ enabled: false })]);
    });

    it('routes the rule across projects when cross-project search is on', async () => {
      const { resources } = await new KnownFailuresStrategy().resources({
        ...createContext([createKnowledgeIndicator()]),
        cpsEnabled: true,
      });

      expect(resources[0].data.query.base).toMatch(/^SET project_routing="[^"]+";\nFROM logs-\*/);
    });
  });

  // The generator finds a rule's rows by recomputing its id, so any input the rule depends on must
  // move it, and nothing else may.
  describe('getKnownFailureRuleId', () => {
    const getId = (overrides: Partial<QueryKnowledgeIndicator>, cpsEnabled = false) =>
      getKnownFailureRuleId({
        spaceId: 'default',
        knowledgeIndicator: createKnowledgeIndicator(overrides),
        cpsEnabled,
      });

    it('changes with the query, the source and the routing', () => {
      const id = getId({});

      expect(getId({ esql: 'FROM logs-* | WHERE message : "refused"' })).not.toBe(id);
      expect(getId({ source_id: 'source-2' })).not.toBe(id);
      expect(getId({}, true)).not.toBe(id);
    });

    it('keeps the id when only the title changes', () => {
      expect(getId({ title: 'Renamed' })).toBe(getId({}));
    });
  });
});
