/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAuditMetaAlertAsEvidenceEvaluator } from './audit_meta_alert_as_evidence_evaluator';
import {
  emptyInput,
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

const evaluator = createAuditMetaAlertAsEvidenceEvaluator(resolveReferenceFromMetadata);

const gold = makeGold({
  alertGroups: { meta: ['m1', 'm2'], underlying: ['u1', 'u2'] },
  metaAlertGroups: ['meta'],
  expectedDiscoveries: 'none',
});

const run = (alertIds: string[][], g = gold) =>
  evaluator.evaluate({
    input: emptyInput,
    output: makeOutput(alertIds.map((ids) => makeDiscovery({ alertIds: ids }))),
    expected: undefined,
    metadata: { gold: g },
  } as never);

describe('MetaAlertAsEvidence evaluator', () => {
  it('scores 0 when a discovery cites only meta alerts', async () => {
    expect(await run([['m1', 'm2']])).toMatchObject({ score: 0, label: 'meta_alert_as_evidence' });
  });

  it('scores 1 when a discovery cites the underlying alerts', async () => {
    expect(await run([['u1', 'u2']])).toMatchObject({
      score: 1,
      label: 'underlying_alerts_cited',
    });
  });

  it('scores 1 when a meta alert is cited beside the underlying alerts it summarises', async () => {
    expect(await run([['m1', 'u1']])).toMatchObject({ score: 1 });
  });

  it('scores 0 when any citing discovery is meta-only, even beside a good one', async () => {
    expect(await run([['u1'], ['m1']])).toMatchObject({ score: 0 });
  });

  it('separates the two behaviours: meta-only is 0 and underlying-only is 1', async () => {
    const meta = await run([['m1']]);
    const underlying = await run([['u1']]);
    expect([meta.score, underlying.score]).toEqual([0, 1]);
  });

  it('is N/A when the scenario has no meta alerts', async () => {
    expect(await run([['m1']], makeGold({ alertGroups: { a: ['m1'] } }))).toMatchObject({
      score: null,
      label: 'N/A',
    });
  });

  it('scores 1 with no discoveries', async () => {
    expect(await run([])).toMatchObject({ score: 1, label: 'no_discoveries' });
  });

  it('is null with no_citations when discoveries cite nothing', async () => {
    expect(await run([[], []])).toMatchObject({ score: null, label: 'no_citations' });
  });

  it('judges only the citing discoveries', async () => {
    expect(await run([[], ['u1']])).toMatchObject({ score: 1 });
    expect(await run([[], ['m1']])).toMatchObject({ score: 0 });
  });

  it('ignores invented alert ids: a meta alert beside an unknown id is still meta-only', async () => {
    expect(await run([['m1', 'invented']])).toMatchObject({
      score: 0,
      label: 'meta_alert_as_evidence',
    });
  });

  it('is null with no_citations when every cited id is unknown', async () => {
    expect(await run([['invented']])).toMatchObject({ score: null, label: 'no_citations' });
  });
});
