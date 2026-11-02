/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEncodedPowershellTwin,
  encodedPowershellScenario,
  ENCODED_POWERSHELL_ATTACK_ID,
  ENCODED_POWERSHELL_HOST,
} from '../scenarios/encoded_powershell';
import { FP_TP_TWIN_SEED_LABEL } from './constants';
import { twinToWorld } from './seed_live';
import { toRunMarker, uniquify } from './uniquify';

describe('uniquify', () => {
  const { sharedNames } = encodedPowershellScenario;
  const twin = buildEncodedPowershellTwin('fp', toRunMarker('run1'));
  const world = uniquify(twinToWorld(twin), 'run1', sharedNames);
  const gold = uniquify(twin.gold, 'run1', sharedNames);

  it('returns a run marker built from the default seed label', () => {
    expect(toRunMarker('run1')).toBe(`${FP_TP_TWIN_SEED_LABEL}-run1`);
  });

  it('returns a suffixed attack id', () => {
    expect(world.attackId).toBe(`${ENCODED_POWERSHELL_ATTACK_ID}-run1`);
  });

  it('returns an attack document whose uuid matches the attack id', () => {
    expect(world.attack?.['kibana.alert.uuid']).toBe(world.attackId);
  });

  it('returns a suffixed host name on every alert', () => {
    expect(
      world.alerts.every(
        (alert) =>
          (alert.source.host as { name?: string }).name === `${ENCODED_POWERSHELL_HOST}-run1`
      )
    ).toBe(true);
  });

  it('returns gold entity ids that match the seeded entity ids', () => {
    const entityIds = new Set(world.entities.map((entity) => entity.id));
    expect(gold.evidenceIds.entity.every((id) => entityIds.has(id))).toBe(true);
  });

  it('returns gold event ids that match the seeded event ids', () => {
    const eventIds = new Set(world.events.map((event) => event.id));
    expect(gold.evidenceIds.event.every((id) => eventIds.has(id))).toBe(true);
  });

  it('returns strings without shared names unchanged', () => {
    expect(uniquify('unrelated', 'run1', sharedNames)).toBe('unrelated');
  });

  it('returns non-string values unchanged', () => {
    expect(uniquify({ count: 3, flag: true, none: null }, 'run1', sharedNames)).toEqual({
      count: 3,
      flag: true,
      none: null,
    });
  });
});
