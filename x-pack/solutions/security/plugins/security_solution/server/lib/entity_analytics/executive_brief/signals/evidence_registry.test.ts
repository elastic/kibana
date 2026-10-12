/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalRun } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildEvidence } from './evidence_registry';
import type { SignalResult } from './evidence_registry';
import { identityResolution } from './resolve_entities';
import type { EntityResolution, ResolvedEntity } from './resolve_entities';
import type { EntityRef } from './types';

const GOLDEN: EntityRef = { euid: 'user:ann@okta', type: 'user', name: 'ann' };
const ALIAS: EntityRef = { euid: 'user:ann@h1@local', type: 'user', name: 'ann@h1' };
const HOST: EntityRef = { euid: 'host:h1', type: 'host', name: 'h1' };
const OTHER: EntityRef = { euid: 'host:h2', type: 'host', name: 'h2' };

const resolved = (ref: EntityRef, extra: Partial<ResolvedEntity> = {}): ResolvedEntity => ({
  euid: ref.euid,
  type: ref.type,
  name: ref.name,
  aliasCount: 0,
  attributes: { euid: ref.euid },
  ...extra,
});

/** ALIAS resolves to GOLDEN; everything else is its own golden entity. */
const resolution: EntityResolution = {
  ...identityResolution([GOLDEN, HOST, OTHER]),
  golden: (euid) => (euid === ALIAS.euid ? GOLDEN.euid : euid),
  get: (euid) =>
    ({
      [GOLDEN.euid]: resolved(GOLDEN, {
        aliasCount: 1,
        attributes: { euid: GOLDEN.euid, riskScore: 80, riskLevel: 'High' },
      }),
      [HOST.euid]: resolved(HOST),
    }[euid]),
};

const run = (id: string): SignalRun => ({
  id,
  title: id,
  capability: 'detections',
  status: 'ok',
  durationMs: 1,
  factCount: 0,
  linkCount: 0,
});

const linksOf = (result: SignalResult) =>
  buildEvidence({ results: [result], runs: [run(result.signalId)], resolution }).links;

describe('buildEvidence', () => {
  it('assigns ENT, F and L ids deterministically, keyed by golden euid', () => {
    const input = {
      results: [
        {
          signalId: 'a',
          output: {
            facts: [
              { kind: 'alert_activity' as const, title: 'alias fact', entities: [ALIAS, HOST] },
              { kind: 'alert_activity' as const, title: 'golden fact', entities: [GOLDEN] },
            ],
            links: [{ type: 'co_alert' as const, from: ALIAS, to: HOST, factIndexes: [1, 0] }],
          },
        },
        {
          signalId: 'b',
          output: {
            facts: [{ kind: 'high_risk_entity' as const, title: 'other', entities: [OTHER] }],
          },
        },
      ],
      runs: [run('a'), run('b')],
      resolution,
    };

    const evidence = buildEvidence(input);

    expect(evidence).toEqual(buildEvidence(input));
    expect(Object.keys(evidence.entities)).toEqual(['ENT-1', 'ENT-2', 'ENT-3']);
    expect(evidence.entities['ENT-1']).toEqual({
      id: 'ENT-1',
      euid: GOLDEN.euid,
      type: 'user',
      name: 'ann',
      riskScore: 80,
      riskLevel: 'High',
      aliasCount: 1,
    });
    expect(
      evidence.facts.map(({ id, signalId, entities }) => ({ id, signalId, entities }))
    ).toEqual([
      { id: 'F-1', signalId: 'a', entities: ['ENT-1', 'ENT-2'] },
      { id: 'F-2', signalId: 'a', entities: ['ENT-1'] },
      { id: 'F-3', signalId: 'b', entities: ['ENT-3'] },
    ]);
    // Undirected links are stored with their endpoints in euid order.
    expect(evidence.links).toEqual([
      { id: 'L-1', type: 'co_alert', from: 'ENT-2', to: 'ENT-1', factIds: ['F-1', 'F-2'] },
    ]);
    expect(evidence.signals.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('drops links that collapse onto one entity after resolution and merges duplicates', () => {
    const links = linksOf({
      signalId: 'a',
      output: {
        facts: [{ kind: 'attack_discovery', title: 'ad', entities: [GOLDEN, HOST] }],
        links: [
          // An alias and its golden entity are the same entity: no self-link.
          { type: 'same_attack', from: ALIAS, to: GOLDEN, factIndexes: [0] },
          { type: 'same_attack', from: GOLDEN, to: HOST, factIndexes: [0] },
          // The same undirected link, reversed and through the alias.
          { type: 'same_attack', from: HOST, to: ALIAS, firstSeen: '2026-10-01T00:00:00Z' },
          // A different type between the same entities is a different link.
          { type: 'co_alert', from: GOLDEN, to: HOST },
        ],
      },
    });

    expect(links).toEqual([
      {
        id: 'L-1',
        type: 'same_attack',
        from: 'ENT-2',
        to: 'ENT-1',
        factIds: ['F-1'],
        firstSeen: '2026-10-01T00:00:00Z',
      },
      { id: 'L-2', type: 'co_alert', from: 'ENT-2', to: 'ENT-1', factIds: [] },
    ]);
  });

  it('keeps both directions of a directed link type', () => {
    const links = linksOf({
      signalId: 'a',
      output: {
        facts: [],
        links: [
          { type: 'owns', from: GOLDEN, to: HOST },
          { type: 'owns', from: HOST, to: ALIAS },
          { type: 'owns', from: ALIAS, to: HOST },
        ],
      },
    });

    expect(links.map(({ id, from, to }) => `${id} ${from}>${to}`)).toEqual([
      'L-1 ENT-1>ENT-2',
      'L-2 ENT-2>ENT-1',
    ]);
  });
});
