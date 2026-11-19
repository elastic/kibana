/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { QueryLink } from '@kbn/significant-events-schema';
import { createKnowledgeIndicatorReader } from './knowledge_indicator_reader';

const createLink = (sourceId: string, id: string, esql: string): QueryLink => ({
  source_id: sourceId,
  rule_backed: false,
  rule_id: `rule-${id}`,
  query: {
    id,
    type: 'match',
    title: `Title ${id}`,
    description: `Description ${id}`,
    esql: { query: esql },
    severity_score: 70,
    features: [{ id: 'checkout' }],
  },
});

/** Honours the `enabled` filter, so a reader that asks for enabled sources only loses the others. */
const createSourcesClient = (sources: Array<Pick<NightshiftSource, 'id' | 'enabled'>>) =>
  ({
    list: jest.fn(async ({ enabled }: { enabled?: boolean }) => {
      const listed = sources.filter(
        (source) => enabled === undefined || source.enabled === enabled
      );
      return { sources: listed, total: listed.length };
    }),
  } as unknown as SourcesClient);

describe('createKnowledgeIndicatorReader', () => {
  describe('listQueryKnowledgeIndicators', () => {
    it('keeps the knowledge indicators of disabled sources and drops those of deleted ones', async () => {
      const getQueryLinks = jest
        .fn()
        .mockResolvedValue([
          createLink('enabled-source', 'ki-1', 'FROM logs | WHERE message : "timeout"'),
          createLink('disabled-source', 'ki-2', 'FROM logs | STATS c = COUNT(*)'),
          createLink('deleted-source', 'ki-3', 'FROM logs'),
        ]);
      const reader = createKnowledgeIndicatorReader({
        indicatorReader: { getQueryLinks, getFeatures: jest.fn() },
        getSourcesClient: async () =>
          createSourcesClient([
            { id: 'enabled-source', enabled: true },
            { id: 'disabled-source', enabled: false },
          ]),
      });

      const indicators = await reader.listQueryKnowledgeIndicators();

      expect(indicators).toEqual([
        {
          id: 'ki-1',
          source_id: 'enabled-source',
          source_enabled: true,
          title: 'Title ki-1',
          description: 'Description ki-1',
          esql: 'FROM logs | WHERE message : "timeout"',
          severity_score: 70,
          query_type: 'match',
          feature_ids: ['checkout'],
        },
        expect.objectContaining({ id: 'ki-2', source_enabled: false, query_type: 'stats' }),
      ]);
    });
  });
});
