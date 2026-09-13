/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.2 — Alias map tests.
 *
 * Covers:
 *   - ALIAS_TO_BUILDER_TYPE_ID: alias → builder type id
 *   - BUILDER_TYPE_ID_TO_ALIAS: builder type id → alias
 *   - assertAliasBijectivity: both directions of the startup check
 *     - passes when the registered set matches the map
 *     - fails (first direction) when an alias's builder type is not registered
 *     - fails (second direction) when two aliases share a builder type id
 *       (tested via a mutated copy of the entries)
 *
 * Ref: rule-domain-model.md "The type discriminator in the public model"
 */

import {
  ALIAS_TO_BUILDER_TYPE_ID,
  ALIAS_TO_KIND,
  BUILDER_TYPE_ID_TO_ALIAS,
  ALIAS_MAP,
  assertAliasBijectivity,
} from '../rule_alias_map';

// ---------------------------------------------------------------------------
// Lookup table correctness
// ---------------------------------------------------------------------------

describe('ALIAS_TO_BUILDER_TYPE_ID', () => {
  it('maps query → security.detection.query', () => {
    expect(ALIAS_TO_BUILDER_TYPE_ID.query).toBe('security.detection.query');
  });

  it('maps threshold → security.detection.threshold', () => {
    expect(ALIAS_TO_BUILDER_TYPE_ID.threshold).toBe('security.detection.threshold');
  });

  it('covers every entry in ALIAS_MAP (no orphan)', () => {
    for (const entry of ALIAS_MAP) {
      expect(ALIAS_TO_BUILDER_TYPE_ID[entry.alias]).toBe(entry.builderTypeId);
    }
  });
});

describe('BUILDER_TYPE_ID_TO_ALIAS', () => {
  it('maps security.detection.query → query', () => {
    expect(BUILDER_TYPE_ID_TO_ALIAS['security.detection.query']).toBe('query');
  });

  it('maps security.detection.threshold → threshold', () => {
    expect(BUILDER_TYPE_ID_TO_ALIAS['security.detection.threshold']).toBe('threshold');
  });

  it('is the inverse of ALIAS_TO_BUILDER_TYPE_ID', () => {
    for (const [alias, builderId] of Object.entries(ALIAS_TO_BUILDER_TYPE_ID)) {
      expect(BUILDER_TYPE_ID_TO_ALIAS[builderId]).toBe(alias);
    }
  });
});

describe('ALIAS_TO_KIND', () => {
  it('maps query → signal', () => {
    expect(ALIAS_TO_KIND.query).toBe('signal');
  });

  it('maps threshold → signal', () => {
    expect(ALIAS_TO_KIND.threshold).toBe('signal');
  });

  it('is consistent with ALIAS_MAP entry kind pins', () => {
    for (const entry of ALIAS_MAP) {
      expect(ALIAS_TO_KIND[entry.alias]).toBe(entry.kind);
    }
  });
});

describe('ALIAS_MAP entries', () => {
  it('every entry pins kind: signal', () => {
    for (const entry of ALIAS_MAP) {
      expect(entry.kind).toBe('signal');
    }
  });

  it('every entry has a createSchema with a parse method', () => {
    for (const entry of ALIAS_MAP) {
      expect(typeof entry.createSchema.parse).toBe('function');
    }
  });

  it('no two entries share the same builderTypeId (bijective by construction)', () => {
    const ids = ALIAS_MAP.map((e) => e.builderTypeId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('no two entries share the same alias (bijective by construction)', () => {
    const aliases = ALIAS_MAP.map((e) => e.alias);
    const uniqueAliases = new Set(aliases);
    expect(uniqueAliases.size).toBe(aliases.length);
  });
});

// ---------------------------------------------------------------------------
// assertAliasBijectivity startup check
// ---------------------------------------------------------------------------

describe('assertAliasBijectivity', () => {
  /** The complete set of builder type ids the map expects. */
  const completeSet = new Set(['security.detection.query', 'security.detection.threshold']);

  it('passes when the registered set exactly matches the map', () => {
    expect(() => assertAliasBijectivity(completeSet)).not.toThrow();
  });

  it('passes when the registered set is a superset of the map', () => {
    // Extra registered types that have no alias are fine — those are not
    // detection rules and do not need an alias.
    const superset = new Set([...completeSet, 'other.plugin.type']);
    expect(() => assertAliasBijectivity(superset)).not.toThrow();
  });

  it('fails when one alias is missing from the registered set', () => {
    // Simulate a deployment where security.detection.threshold was not
    // registered (e.g. a plugin failure).
    const missingThreshold = new Set(['security.detection.query']);
    expect(() => assertAliasBijectivity(missingThreshold)).toThrow(
      /security\.detection\.threshold.*not registered/
    );
  });

  it('fails when the registered set is empty', () => {
    expect(() => assertAliasBijectivity(new Set())).toThrow();
  });

  it('error message names the missing builder type id', () => {
    const missingQuery = new Set(['security.detection.threshold']);
    try {
      assertAliasBijectivity(missingQuery);
      fail('expected to throw');
    } catch (err) {
      expect((err as Error).message).toContain('security.detection.query');
    }
  });

  it('error message names the offending alias when a type is missing', () => {
    const missingThreshold = new Set(['security.detection.query']);
    try {
      assertAliasBijectivity(missingThreshold);
      fail('expected to throw');
    } catch (err) {
      expect((err as Error).message).toContain('threshold');
    }
  });
});
