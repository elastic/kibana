/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUDIT_SCENARIOS } from '../audit_failure_classes/registry';
import { resolveScoredDiscoveries, selectScoredDiscoveries } from './audit_evaluator_helpers';
import {
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

const gold = makeGold({
  alertGroups: { chain: ['c1', 'c2'], other: ['o1'] },
  confirmedGroups: ['chain'],
});

describe('selectScoredDiscoveries', () => {
  const confirmed = makeDiscovery({ title: 'confirmed', alertIds: ['c1', 'c2'] });
  const unconfirmed = makeDiscovery({ title: 'unconfirmed', alertIds: ['o1'] });
  const mixed = makeDiscovery({ title: 'mixed', alertIds: ['c1', 'o1'] });
  const uncited = makeDiscovery({ title: 'uncited', alertIds: [] });
  const unknownAlert = makeDiscovery({ title: 'unknown', alertIds: ['zzz'] });

  it('exempts only discoveries whose cited alerts are all in confirmed groups', () => {
    expect(
      selectScoredDiscoveries(gold, [confirmed, unconfirmed, mixed, uncited, unknownAlert]).map(
        ({ title }) => title
      )
    ).toEqual(['unconfirmed', 'mixed', 'uncited', 'unknown']);
  });

  it('scores everything when no group is confirmed', () => {
    expect(
      selectScoredTitles(makeGold({ alertGroups: { chain: ['c1', 'c2'] } }), [confirmed])
    ).toEqual(['confirmed']);
  });

  it('ignores a confirmed group name with no alerts', () => {
    expect(selectScoredTitles(makeGold({ confirmedGroups: ['missing'] }), [confirmed])).toEqual([
      'confirmed',
    ]);
  });
});

describe('selectScoredDiscoveries with unconfirmed entity values', () => {
  const unconfirmedEntityValues = ['203.0.113.50', 'ci-runner'];
  const select = (discoveries: Parameters<typeof selectScoredDiscoveries>[1]) =>
    selectScoredDiscoveries(gold, discoveries, unconfirmedEntityValues).map(({ title }) => title);

  it('scores a confirmed-only discovery whose advice names an unconfirmed entity', () => {
    const chainOnly = makeDiscovery({ title: 'chain only', alertIds: ['c1'] });
    const blocksBenign = makeDiscovery({
      title: 'blocks benign',
      alertIds: ['c1'],
      detailsMarkdown: 'Block {{ source.ip 203.0.113.50 }} at the firewall.',
    });
    const namesRunner = makeDiscovery({
      title: 'names runner',
      alertIds: ['c2'],
      summaryMarkdown: 'Disable the CI-Runner role.',
    });
    expect(select([chainOnly, blocksBenign, namesRunner])).toEqual([
      'blocks benign',
      'names runner',
    ]);
  });
});

function selectScoredTitles(
  g: ReturnType<typeof makeGold>,
  discoveries: Parameters<typeof selectScoredDiscoveries>[1]
): string[] {
  return selectScoredDiscoveries(g, discoveries).map(({ title }) => title);
}

describe('resolveScoredDiscoveries with a registered scenario', () => {
  it('scores a chain-only discovery that recommends blocking the shared CI egress IP', () => {
    const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'positive-chain-with-noise')!;
    const chainId = scenario.gold.alertGroups['clickfix-chain'][0];
    const metadata = { scenarioId: scenario.id, inputVariant: 'enriched' };
    const resolve = (detailsMarkdown: string) =>
      resolveScoredDiscoveries({
        metadata,
        output: makeOutput([
          makeDiscovery({ title: 'chain', alertIds: [chainId], detailsMarkdown }),
        ]),
      });

    expect(resolve('Isolate WS-FIN-214 and reset j.meyer.')).toEqual({
      result: expect.objectContaining({ label: 'N/A' }),
    });
    expect(resolve('Block 203.0.113.50 at the perimeter.')).toEqual({
      scored: [expect.objectContaining({ title: 'chain' })],
    });
  });
});

describe('resolveScoredDiscoveries', () => {
  const resolve = (
    output: Parameters<typeof resolveScoredDiscoveries>[0]['output'],
    metadata: unknown = { gold }
  ) =>
    resolveScoredDiscoveries({ metadata, output, resolveReference: resolveReferenceFromMetadata });

  it('returns the scored discoveries', () => {
    const result = resolve(
      makeOutput([
        makeDiscovery({ title: 'a', alertIds: ['c1'] }),
        makeDiscovery({ title: 'b', alertIds: ['o1'] }),
      ])
    );
    expect(result).toEqual({ scored: [expect.objectContaining({ title: 'b' })] });
  });

  it('is N/A with no discoveries', () => {
    expect(resolve(makeOutput([]))).toEqual({
      result: expect.objectContaining({ score: null, label: 'N/A' }),
    });
  });

  it('is N/A when every discovery is confirmed', () => {
    expect(resolve(makeOutput([makeDiscovery({ alertIds: ['c1'] })]))).toEqual({
      result: expect.objectContaining({ score: null, label: 'N/A' }),
    });
  });

  it('is N/A for an unknown scenario and a null-score task_error without insights', () => {
    expect(resolve(makeOutput([makeDiscovery()]), {})).toEqual({
      result: expect.objectContaining({ label: 'N/A' }),
    });
    expect(resolve({ insights: null, errors: ['boom'] })).toEqual({
      result: expect.objectContaining({ score: null, label: 'task_error', explanation: 'boom' }),
    });
  });
});
