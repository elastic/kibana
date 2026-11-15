/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { extractSurroundingPlaceholders, SURROUNDING_BIND_PARAMS } from './hunt_definition';
import { getHuntDefinition, HUNT_DEFINITIONS } from './seed';

const frozen: {
  tradeRevision: string;
  hunts: Array<{ tradeId: string; path: string; resultKind: string }>;
} = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'hunt_library', 'frozen_hunts.json'),
    'utf8'
  )
);

describe('HUNT_DEFINITIONS', () => {
  it('holds 5 to 10 definitions with unique ids', () => {
    expect(HUNT_DEFINITIONS.length).toBeGreaterThanOrEqual(5);
    expect(HUNT_DEFINITIONS.length).toBeLessThanOrEqual(10);
    expect(new Set(HUNT_DEFINITIONS.map(({ id }) => id)).size).toBe(HUNT_DEFINITIONS.length);
  });

  it('matches the approved frozen list and pinned TRADE revision', () => {
    expect(HUNT_DEFINITIONS.map(({ source }) => source.tradeId).sort()).toEqual(
      frozen.hunts.map(({ tradeId }) => tradeId).sort()
    );
    expect(HUNT_DEFINITIONS.map(({ source }) => source.path).sort()).toEqual(
      frozen.hunts.map(({ path: tradePath }) => tradePath).sort()
    );
    for (const { source } of HUNT_DEFINITIONS) {
      expect(source.revision).toBe(frozen.tradeRevision);
    }
  });

  it('uses the single-query contract', () => {
    for (const definition of HUNT_DEFINITIONS) {
      expect(definition.query.id).toBe('main');
    }
  });

  it('covers the required matrix', () => {
    const byPlatform = (platform: string) =>
      HUNT_DEFINITIONS.filter((d) => (d.platform as string[]).includes(platform));

    expect(getHuntDefinition('rare_lsass_process_access')).toBeDefined();
    expect(byPlatform('windows').length + byPlatform('linux').length).toBeGreaterThanOrEqual(2);
    expect(byPlatform('linux').length).toBeGreaterThanOrEqual(1);
    expect(byPlatform('cloud').length + byPlatform('identity').length).toBeGreaterThanOrEqual(1);
    expect(HUNT_DEFINITIONS.some((d) => d.query.resultKind === 'aggregate')).toBe(true);
    expect(HUNT_DEFINITIONS.some((d) => d.query.resultKind === 'raw_event')).toBe(true);
    expect(HUNT_DEFINITIONS.some((d) => d.guidance.expectedFalsePositives.length > 0)).toBe(true);
    expect(HUNT_DEFINITIONS.some((d) => d.query.surroundingEventQuery !== undefined)).toBe(true);
  });

  it('keeps analyst guidance on every definition', () => {
    for (const definition of HUNT_DEFINITIONS) {
      expect(definition.guidance.expectedFalsePositives.length).toBeGreaterThan(0);
      expect(definition.guidance.suggestedPivots.length).toBeGreaterThan(0);
    }
  });

  it('binds every occurrence key field in the surrounding query and only allowed names', () => {
    for (const { query } of HUNT_DEFINITIONS) {
      if (!query.surroundingEventQuery) continue;
      const used = extractSurroundingPlaceholders(query.surroundingEventQuery);
      for (const key of query.occurrence.keyFields) {
        expect(used).toContain(key);
      }
      const allowed = new Set<string>([...query.occurrence.keyFields, ...SURROUNDING_BIND_PARAMS]);
      for (const name of used) {
        expect(allowed.has(name)).toBe(true);
      }
    }
  });

  it('stays within the automated window and the frozen result kinds', () => {
    for (const { query, source } of HUNT_DEFINITIONS) {
      expect(query.defaultTimeRange).toEqual({ from: 'now-7d', to: 'now' });
      const frozenEntry = frozen.hunts.find((hunt) => hunt.tradeId === source.tradeId);
      expect(frozenEntry?.resultKind).toBe(query.resultKind);
    }
  });

  it('freezes the loaded list', () => {
    expect(Object.isFrozen(HUNT_DEFINITIONS)).toBe(true);
    expect(getHuntDefinition('missing')).toBeUndefined();
  });
});
