/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAuditForbiddenJoinEvaluator } from './audit_forbidden_join_evaluator';
import {
  emptyInput,
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

const evaluator = createAuditForbiddenJoinEvaluator(resolveReferenceFromMetadata);

const run = (gold: ReturnType<typeof makeGold>, alertIds: string[][]) =>
  evaluator.evaluate({
    input: emptyInput,
    output: makeOutput(alertIds.map((ids) => makeDiscovery({ alertIds: ids }))),
    expected: undefined,
    metadata: { gold },
  } as never);

const gold = makeGold({
  alertGroups: { a: ['a1', 'a2'], b: ['b1'], c: ['c1'] },
  forbiddenCoCitation: [['a', 'b']],
});

describe('ForbiddenJoin evaluator', () => {
  it('scores 0 when one discovery cites both groups of a forbidden pair', async () => {
    const result = await run(gold, [['a1', 'b1']]);
    expect(result).toMatchObject({ score: 0, label: 'forbidden_join' });
  });

  it('scores 1 when forbidden groups are cited by different discoveries', async () => {
    const result = await run(gold, [['a1', 'a2'], ['b1']]);
    expect(result).toMatchObject({ score: 1, label: 'no_forbidden_join' });
  });

  it('scores 1 when a discovery joins groups that are not a forbidden pair', async () => {
    const result = await run(gold, [['a1', 'c1']]);
    expect(result).toMatchObject({ score: 1 });
  });

  it('scores 1 with no discoveries', async () => {
    expect(await run(gold, [])).toMatchObject({ score: 1 });
  });

  it('is N/A when the scenario has no forbidden pairs', async () => {
    const result = await run(makeGold({ alertGroups: { a: ['a1'] } }), [['a1']]);
    expect(result).toMatchObject({ score: null, label: 'N/A' });
  });

  it('reports a task error instead of a pass when the task produced no insights', async () => {
    const result = await evaluator.evaluate({
      input: emptyInput,
      output: makeOutput(null),
      expected: undefined,
      metadata: { gold },
    } as never);
    expect(result).toMatchObject({ score: null, label: 'task_error' });
  });

  it('is N/A without gold metadata', async () => {
    const result = await evaluator.evaluate({
      input: emptyInput,
      output: makeOutput([]),
      expected: undefined,
      metadata: {},
    } as never);
    expect(result).toMatchObject({ score: null, label: 'N/A' });
  });

  describe('no_citations', () => {
    const runDiscoveries = (discoveries: Array<Parameters<typeof makeDiscovery>[0]>) =>
      evaluator.evaluate({
        input: emptyInput,
        output: makeOutput(discoveries.map(makeDiscovery)),
        expected: undefined,
        metadata: { gold },
      } as never);

    it('is null when the only discovery cites no alert, even if its text joins the pair', async () => {
      const result = await runDiscoveries([
        {
          alertIds: [],
          title: 'Principals a and b are one actor',
          detailsMarkdown: 'Group a (a1) and group b (b1) share one actor.',
        },
      ]);
      expect(result).toMatchObject({ score: null, label: 'no_citations' });
    });

    it('judges only the citing discoveries in a mix, and reports the skipped ones', async () => {
      const clean = await runDiscoveries([{ alertIds: [] }, { alertIds: ['a1'] }]);
      expect(clean).toMatchObject({ score: 1, label: 'no_forbidden_join' });
      expect(clean.explanation).toContain('1 discoveries without known citations');

      const joined = await runDiscoveries([{ alertIds: [] }, { alertIds: ['a1', 'b1'] }]);
      expect(joined).toMatchObject({ score: 0, label: 'forbidden_join' });
    });

    it('ignores invented alert ids: a discovery citing only unknown ids is not judged', async () => {
      const result = await runDiscoveries([{ alertIds: ['made-up-1', 'made-up-2'] }]);
      expect(result).toMatchObject({ score: null, label: 'no_citations' });
    });

    it('judges the known ids of a discovery that also cites invented ones', async () => {
      const joined = await runDiscoveries([{ alertIds: ['made-up-1', 'a1', 'b1'] }]);
      expect(joined).toMatchObject({ score: 0, label: 'forbidden_join' });

      const mixed = await runDiscoveries([{ alertIds: ['made-up-1'] }, { alertIds: ['a1'] }]);
      expect(mixed).toMatchObject({ score: 1, label: 'no_forbidden_join' });
      expect(mixed.explanation).toContain('1 discoveries without known citations');
    });

    it('keeps score 1 when there are no discoveries at all', async () => {
      expect(await runDiscoveries([])).toMatchObject({ score: 1, label: 'no_forbidden_join' });
    });
  });
});
