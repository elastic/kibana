/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { briefFixture, evidenceFixture } from '../__fixtures__/brief_fixture';
import {
  getEntity,
  getFact,
  getHowFoundCapabilities,
  getLink,
  getResponseFacts,
  getTactics,
  getThreatFacts,
  getThreatLinks,
} from './resolve';

const [s1, s2, s3] = briefFixture.threats;

describe('evidence resolve', () => {
  it('resolves entities, facts and links by id and ignores unknown or malformed ids', () => {
    expect(getEntity(evidenceFixture, 'ENT-1')?.name).toBe('a.rodriguez');
    expect(getFact(evidenceFixture, 'F-3')?.kind).toBe('relationship_first_seen');
    expect(getLink(evidenceFixture, 'L-1')?.type).toBe('same_attack');
    expect(getEntity(evidenceFixture, 'ENT-99')).toBeUndefined();
    expect(getFact(evidenceFixture, 'ENT-1')).toBeUndefined();
    expect(getLink(evidenceFixture, 'nope')).toBeUndefined();
  });

  it('collects the facts a threat cites once, key events first', () => {
    const ids = getThreatFacts(s1, evidenceFixture).map(({ id }) => id);
    expect(ids).toEqual(['F-2', 'F-3', 'F-1', 'F-8', 'F-4', 'F-5', 'F-6', 'F-7', 'F-9']);
  });

  it('collects cited links and links between the threat entities', () => {
    expect(getThreatLinks(s3, evidenceFixture).map(({ id }) => id)).toEqual(['L-4', 'L-5']);
    expect(getThreatLinks(s2, evidenceFixture).map(({ id }) => id)).toEqual(['L-6']);
  });

  it('keeps only response facts', () => {
    const ids = getResponseFacts(getThreatFacts(s2, evidenceFixture)).map(({ id }) => id);
    expect(ids).toEqual(['F-11', 'F-12']);
  });

  it('orders tactics along the kill chain', () => {
    const tactics = getTactics(getThreatFacts(s1, evidenceFixture));
    expect(tactics).toEqual([
      'Initial Access',
      'Execution',
      'Privilege Escalation',
      'Credential Access',
      'Lateral Movement',
    ]);
  });

  it('derives the how-found capabilities from facts, links and entity enrichment', () => {
    expect(getHowFoundCapabilities(s1, evidenceFixture)).toEqual([
      'attack_discovery',
      'detections',
      'risk_scoring',
      'asset_criticality',
      'watchlists',
      'relationships',
      'entity_resolution',
      'hunting_leads',
    ]);
    expect(getHowFoundCapabilities(s3, evidenceFixture)).toEqual(['detections', 'relationships']);
    expect(getHowFoundCapabilities(s2, evidenceFixture)).toEqual([
      'attack_discovery',
      'detections',
      'relationships',
      'entity_resolution',
      'cases',
    ]);
  });
});
