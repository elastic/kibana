/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

function selectScoredTitles(
  g: ReturnType<typeof makeGold>,
  discoveries: Parameters<typeof selectScoredDiscoveries>[1]
): string[] {
  return selectScoredDiscoveries(g, discoveries).map(({ title }) => title);
}

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
