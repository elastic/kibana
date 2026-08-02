/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_GATE_REGISTRY,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  WATCH_AUTONOMY_LEVELS,
} from '@kbn/pnd-common';
import { buildAutonomyResponse } from '.';

describe('buildAutonomyResponse', () => {
  it('echoes the watchId', () => {
    expect(buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'manual').watchId).toBe(
      SYSTEM_SECURITY_WATCH_FLOOR_ID
    );
  });

  it('echoes the autonomy level', () => {
    expect(buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'assisted').autonomyLevel).toBe(
      'assisted'
    );
  });

  it('includes only the gates owned by the watch', () => {
    const { autoAccept } = buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'supervised');

    expect(Object.keys(autoAccept).sort()).toEqual(
      ['incident_contained', 'open_investigation', 'promote_incident'].sort()
    );
  });

  it('omits every gate for a watch that owns none', () => {
    expect(buildAutonomyResponse(SYSTEM_SECURITY_WATCH_DARK_ID, 'supervised').autoAccept).toEqual(
      {}
    );
  });

  it('auto-accepts no gate at the manual level', () => {
    const { autoAccept } = buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'manual');

    expect(Object.values(autoAccept).every((value) => value === false)).toBe(true);
  });

  it('auto-accepts the reversible open_investigation gate at the assisted level', () => {
    expect(
      buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'assisted').autoAccept
        .open_investigation
    ).toBe(true);
  });

  it('does not auto-accept the irreversible promote_incident gate at the assisted level', () => {
    expect(
      buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'assisted').autoAccept.promote_incident
    ).toBe(false);
  });

  it('auto-accepts the reversible open_investigation gate at the supervised level', () => {
    expect(
      buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'supervised').autoAccept
        .open_investigation
    ).toBe(true);
  });

  it('never auto-accepts the alwaysGate incident_contained gate at the supervised level', () => {
    expect(
      buildAutonomyResponse(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'supervised').autoAccept
        .incident_contained
    ).toBe(false);
  });

  it('never auto-accepts any alwaysGate gate at any level', () => {
    const alwaysGateIds = PND_GATE_REGISTRY.filter((gate) => gate.alwaysGate).map(
      (gate) => gate.gateId
    );

    const flagged = WATCH_AUTONOMY_LEVELS.flatMap((level) =>
      [SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID].flatMap(
        (watchId) => {
          const { autoAccept } = buildAutonomyResponse(watchId, level);
          return alwaysGateIds
            .filter((gateId) => gateId in autoAccept)
            .map((gateId) => autoAccept[gateId as keyof typeof autoAccept]);
        }
      )
    );

    expect(flagged.every((value) => value === false)).toBe(true);
  });
});
