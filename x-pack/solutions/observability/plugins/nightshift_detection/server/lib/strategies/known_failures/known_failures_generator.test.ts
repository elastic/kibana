/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryKnowledgeIndicator } from '@kbn/significant-events-plugin/server';
import type { GeneratorContext } from '../types';
import { getKnownFailureRuleId } from './known_failure_rule';
import { KnownFailuresGenerator } from './known_failures_generator';

const WINDOW = { from: Date.UTC(2026, 10, 20, 10, 0), to: Date.UTC(2026, 10, 20, 10, 5) };

const createKnowledgeIndicator = (id: string, esql: string): QueryKnowledgeIndicator => ({
  id,
  source_id: 'source-1',
  source_enabled: true,
  title: id,
  description: id,
  esql,
  query_type: 'match',
  feature_ids: [],
});

describe('KnownFailuresGenerator', () => {
  // The join is the generator's only logic until the mapping lands: a wrong id reads another
  // indicator's rows, or none.
  it('reads the window of the enabled rules that watch a current knowledge indicator', async () => {
    const watched = createKnowledgeIndicator('watched', 'FROM logs | WHERE message : "timeout"');
    const offRule = createKnowledgeIndicator('off', 'FROM logs | WHERE message : "refused"');
    const getId = (knowledgeIndicator: QueryKnowledgeIndicator) =>
      getKnownFailureRuleId({ spaceId: 'default', knowledgeIndicator, cpsEnabled: false });
    const readRows = jest.fn().mockResolvedValue([]);

    await new KnownFailuresGenerator().generate({
      spaceId: 'default',
      window: WINDOW,
      cpsEnabled: false,
      abortSignal: new AbortController().signal,
      knowledge: { listQueryKnowledgeIndicators: async () => [watched, offRule] },
      rules: {
        listManaged: async () => [
          { id: getId(watched), enabled: true },
          { id: getId(offRule), enabled: false },
          // The rule of a knowledge indicator deleted since: nothing to describe its rows.
          { id: 'orphan', enabled: true },
        ],
        readRows,
      },
    } as unknown as GeneratorContext);

    expect(readRows).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', ruleIds: [getId(watched)], ...WINDOW })
    );
  });
});
