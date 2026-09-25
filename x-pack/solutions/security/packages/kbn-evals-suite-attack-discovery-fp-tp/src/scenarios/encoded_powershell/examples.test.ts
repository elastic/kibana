/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpWorld } from '../../world';
import { buildFpTpExampleWorld } from '..';
import { ENCODED_POWERSHELL_EXAMPLES } from './examples';

const entitySubType = (world: FpTpWorld): unknown =>
  world.entities.map((entity) => (entity.source.entity as { sub_type?: string }).sub_type)[0];

const processParents = (world: FpTpWorld): string[] =>
  world.events.flatMap((event) => {
    const parent = (event.source.process as { parent?: { name?: string } } | undefined)?.parent;
    return parent?.name ? [parent.name] : [];
  });

const situationOf = (id: string): string | undefined =>
  ENCODED_POWERSHELL_EXAMPLES.find((example) => example.id === id)?.situation;

describe('encoded-powershell examples', () => {
  it('returns eight examples', () => {
    expect(ENCODED_POWERSHELL_EXAMPLES).toHaveLength(8);
  });

  it('returns U1 for the lookalike fp', () => {
    expect(situationOf('encoded-powershell.fp')).toBe('U1');
  });

  it('returns U6 for the true attack', () => {
    expect(situationOf('encoded-powershell.tp')).toBe('U6');
  });

  it('returns an mdm_management entity for the lookalike fp', () => {
    expect(entitySubType(buildFpTpExampleWorld('encoded-powershell.fp', 'run1'))).toBe(
      'mdm_management'
    );
  });

  it('returns no entities when entities are missing', () => {
    expect(
      buildFpTpExampleWorld('encoded-powershell.tp-entities-missing', 'run1').entities
    ).toEqual([]);
  });

  it('returns no entities for the lookalike fp with entities missing', () => {
    expect(
      buildFpTpExampleWorld('encoded-powershell.fp-entities-missing', 'run1').entities
    ).toEqual([]);
  });

  it('returns fp raw events for the lookalike fp with entities missing', () => {
    expect(
      processParents(buildFpTpExampleWorld('encoded-powershell.fp-entities-missing', 'run1'))
    ).toContain('ccmexec.exe');
  });

  it('returns no raw events when events are missing', () => {
    expect(buildFpTpExampleWorld('encoded-powershell.tp-events-missing', 'run1').events).toEqual(
      []
    );
  });

  it('returns fp entities in the mixed world', () => {
    expect(entitySubType(buildFpTpExampleWorld('encoded-powershell.mixed-world', 'run1'))).toBe(
      'mdm_management'
    );
  });

  it('returns tp raw events in the mixed world', () => {
    expect(
      processParents(buildFpTpExampleWorld('encoded-powershell.mixed-world', 'run1'))
    ).toContain('WINWORD.EXE');
  });

  it('returns no attack document when the attack discovery is missing', () => {
    expect(
      buildFpTpExampleWorld('encoded-powershell.failed-missing-ad', 'run1').attack
    ).toBeUndefined();
  });

  it('returns an attack that cites an alert the world does not seed', () => {
    const world = buildFpTpExampleWorld('encoded-powershell.failed-missing-cited-alert', 'run1');
    const seeded = new Set(world.alerts.map((alert) => alert.id));
    const cited = world.attack?.['kibana.alert.attack_discovery.alert_ids'] as string[];
    expect(cited.some((id) => !seeded.has(id))).toBe(true);
  });
});
