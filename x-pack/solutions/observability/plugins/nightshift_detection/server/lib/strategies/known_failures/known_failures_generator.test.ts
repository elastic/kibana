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
  // A wrong id reads another indicator's rows, or none.
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
      knowledge: {
        listQueryLinks: async () => [watched, offRule],
        listFeatures: async () => [],
      },
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

  it("reports each rule's latest row once, about the service the knowledge indicator watches", async () => {
    const watched = {
      ...createKnowledgeIndicator('watched', 'FROM logs | WHERE message : "timeout"'),
      feature_ids: ['checkout'],
    };
    const ruleId = getKnownFailureRuleId({
      spaceId: 'default',
      knowledgeIndicator: watched,
      cpsEnabled: false,
    });
    const createRow = (minute: number, recentMax: number) => ({
      rule_id: ruleId,
      scheduled_timestamp: WINDOW.from + minute * 60_000,
      data: {
        change_at: WINDOW.from - 10 * 60_000,
        change_type: 'step_change',
        change_pvalue: 1e-20,
        reference: 2,
        level_at_change: 25,
        recovery_threshold: 13.5,
        recent_max: recentMax,
        window_end: WINDOW.from + (minute - 1) * 60_000,
      },
    });
    const listFeatures = jest.fn().mockResolvedValue([
      {
        id: 'checkout',
        source_id: 'source-1',
        type: 'entity',
        subtype: 'service',
        properties: { name: 'checkout-service' },
      },
    ]);

    const result = await new KnownFailuresGenerator().generate({
      spaceId: 'default',
      window: WINDOW,
      cpsEnabled: false,
      abortSignal: new AbortController().signal,
      knowledge: { listQueryKnowledgeIndicators: async () => [watched], listFeatures },
      rules: {
        listManaged: async () => [{ id: ruleId, enabled: true }],
        // Newest first, as the reader sorts them.
        readRows: async () => [createRow(4, 30), createRow(0, 26)],
      },
    } as unknown as GeneratorContext);

    expect(listFeatures).toHaveBeenCalledWith({ sourceIds: ['source-1'], types: ['entity'] });
    expect(result.readings).toEqual([
      expect.objectContaining({
        fingerprint: 'known_failures:watched',
        entity: { type: 'service', name: 'checkout-service' },
        value: 30,
      }),
    ]);
  });
});
