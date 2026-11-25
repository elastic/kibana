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

const createQuery = (
  id: string,
  esql: string,
  { severityScore = 70, isRuleBacked = false } = {}
): QueryLink => ({
  query: {
    id,
    title: id,
    description: id,
    esql: { query: esql },
    type: 'match',
    severity_score: severityScore,
  },
  source_id: 'source-1',
  rule_backed: isRuleBacked,
  rule_id: `rule-${id}`,
});

describe('KnownFailuresGenerator', () => {
  // The join is the generator's only logic until the mapping lands: a wrong id reads another
  // indicator's rows, or none.
  it('reads the window of the enabled rules that watch a current knowledge indicator', async () => {
    const watched = createQuery('watched', 'FROM logs | WHERE message : "timeout"');
    const offRule = createQuery('off', 'FROM logs | WHERE message : "refused"');
    // Scored down since the last reconcile: its rule is still on until the next one deletes it.
    const downgraded = createQuery('downgraded', 'FROM logs | WHERE message : "reset"', {
      severityScore: 40,
    });
    // Promoted by hand in significant events, whatever its score.
    const promoted = createQuery('promoted', 'FROM logs | WHERE message : "denied"', {
      severityScore: 40,
      isRuleBacked: true,
    });
    const getId = (query: QueryLink) =>
      getKnownFailureRuleId({ spaceId: 'default', query, cpsEnabled: false });
    const readRows = jest.fn().mockResolvedValue([]);

    await new KnownFailuresGenerator().generate({
      spaceId: 'default',
      window: WINDOW,
      sources: [{ id: 'source-1', enabled: true }],
      cpsEnabled: false,
      abortSignal: new AbortController().signal,
      knowledge: { listQueries: async () => [watched, offRule, downgraded, promoted] },
      rules: {
        listManaged: async () => [
          { id: getId(watched), enabled: true },
          { id: getId(offRule), enabled: false },
          { id: getId(downgraded), enabled: true },
          { id: getId(promoted), enabled: true },
          // The rule of a knowledge indicator deleted since: nothing to describe its rows.
          { id: 'orphan', enabled: true },
        ],
        readRows,
      },
    } as unknown as GeneratorContext);

    expect(readRows).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        ruleIds: [getId(watched), getId(promoted)],
        ...WINDOW,
      })
    );
  });
});
