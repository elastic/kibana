/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { GeneratorContext } from '../types';
import { getKnownFailureRuleId } from './known_failure_rule';
import { KnownFailuresGenerator } from './known_failures_generator';

const WINDOW = { from: Date.UTC(2026, 10, 20, 10, 0), to: Date.UTC(2026, 10, 20, 10, 5) };

const createLink = (id: string, esql: string): QueryLink => ({
  query: { id, title: id, description: id, esql: { query: esql }, type: 'match' },
  source_id: 'source-1',
  rule_backed: false,
  rule_id: `rule-${id}`,
});

describe('KnownFailuresGenerator', () => {
  // The join is the generator's only logic until the mapping lands: a wrong id reads another
  // indicator's rows, or none.
  it('reads the window of the enabled rules that watch a current knowledge indicator', async () => {
    const watched = createLink('watched', 'FROM logs | WHERE message : "timeout"');
    const offRule = createLink('off', 'FROM logs | WHERE message : "refused"');
    const getId = (link: QueryLink) =>
      getKnownFailureRuleId({ spaceId: 'default', link, cpsEnabled: false });
    const readRows = jest.fn().mockResolvedValue([]);

    await new KnownFailuresGenerator().generate({
      spaceId: 'default',
      window: WINDOW,
      sources: [{ id: 'source-1', enabled: true }],
      cpsEnabled: false,
      abortSignal: new AbortController().signal,
      knowledge: { listQueries: async () => [watched, offRule] },
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
