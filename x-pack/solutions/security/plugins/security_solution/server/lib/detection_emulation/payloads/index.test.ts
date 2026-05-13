/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
} from '../../../../common/endpoint/service/response_actions/constants';
import { findByTechniqueIds, PAYLOAD_LIBRARY_MAX_ENTRIES, payloadLibrary } from '.';

// ─── Library shape ────────────────────────────────────────────────────────────

describe('payloadLibrary — shape', () => {
  it('hard cap: library must not exceed PAYLOAD_LIBRARY_MAX_ENTRIES entries', () => {
    expect(payloadLibrary.length).toBeLessThanOrEqual(PAYLOAD_LIBRARY_MAX_ENTRIES);
  });

  it('every entry has a non-empty techniqueId', () => {
    for (const entry of payloadLibrary) {
      expect(entry.techniqueId).toBeTruthy();
    }
  });

  it('every entry has a non-empty name', () => {
    for (const entry of payloadLibrary) {
      expect(entry.name).toBeTruthy();
    }
  });

  it('every entry has at least one agentType that is a valid ResponseActionAgentType', () => {
    for (const entry of payloadLibrary) {
      expect(entry.agentTypes.length).toBeGreaterThan(0);
      for (const agentType of entry.agentTypes) {
        expect(RESPONSE_ACTION_AGENT_TYPE).toContain(agentType);
      }
    }
  });

  it('every entry has a command that is a valid ResponseActionsApiCommandNames', () => {
    for (const entry of payloadLibrary) {
      expect(RESPONSE_ACTION_API_COMMANDS_NAMES).toContain(entry.command);
    }
  });

  it('every entry has at least one expectedSignal', () => {
    for (const entry of payloadLibrary) {
      expect(entry.expectedSignals.length).toBeGreaterThan(0);
    }
  });

  it('techniqueIds are unique across the library', () => {
    const ids = payloadLibrary.map((p) => p.techniqueId);
    expect(new Set(ids).size).toEqual(ids.length);
  });
});

// ─── Wave-1 coverage ─────────────────────────────────────────────────────────

describe('payloadLibrary — Wave-1 technique coverage', () => {
  const wave1Techniques = [
    'T1059.001',
    'T1059.003',
    'T1059.004',
    'T1218.005',
    'T1218.011',
    'T1053.005',
    'T1547.001',
    'T1057',
    'T1003.001',
    'T1070.004',
    'T1071.001',
    'T1112',
  ];

  it.each(wave1Techniques)('contains an entry for %s', (techniqueId) => {
    expect(payloadLibrary.some((p) => p.techniqueId === techniqueId)).toBe(true);
  });
});

// ─── findByTechniqueIds ───────────────────────────────────────────────────────

describe('findByTechniqueIds', () => {
  it('returns an empty array for an empty input', () => {
    expect(findByTechniqueIds([])).toEqual([]);
  });

  it('returns an empty array when no IDs match', () => {
    expect(findByTechniqueIds(['T9999.999', 'T0000'])).toEqual([]);
  });

  it('returns exactly the matched entry for a single known technique', () => {
    const result = findByTechniqueIds(['T1057']);
    expect(result).toHaveLength(1);
    expect(result[0].techniqueId).toBe('T1057');
  });

  it('returns multiple entries when multiple IDs match', () => {
    const result = findByTechniqueIds(['T1059.001', 'T1059.003', 'T1059.004']);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.techniqueId)).toEqual(
      expect.arrayContaining(['T1059.001', 'T1059.003', 'T1059.004'])
    );
  });

  it('silently ignores unknown IDs mixed with known ones', () => {
    const result = findByTechniqueIds(['T1112', 'T9999.999']);
    expect(result).toHaveLength(1);
    expect(result[0].techniqueId).toBe('T1112');
  });

  it('preserves original library order in results', () => {
    const result = findByTechniqueIds(['T1112', 'T1059.001']);
    expect(result[0].techniqueId).toBe('T1059.001');
    expect(result[1].techniqueId).toBe('T1112');
  });

  it('deduplicates when the same techniqueId is supplied twice', () => {
    const result = findByTechniqueIds(['T1057', 'T1057']);
    expect(result).toHaveLength(1);
  });
});
