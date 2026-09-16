/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule alias map.
 *
 * Translates between the public short type alias (`'query'`, `'threshold'`)
 * and the namespaced builder type id (`'security.detection.query'`, etc.).
 *
 * One entry per type binds four things:
 *   1. The public alias (`type` on the wire).
 *   2. The namespaced builder type id (what the registry knows).
 *   3. The pinned `kind` for all detection rules.
 *   4. The type's per-type create schema (used by routes and the converter).
 *
 * The map lives here (beside the schemas, not in the shared schema package)
 * because the alias is this API's contract detail — the stored model uses the
 * namespaced id throughout.
 *
 * Bijectivity invariant: every alias resolves to exactly one registered builder
 * type, and no two aliases share one.  `assertAliasBijectivity` checks this at
 * plugin startup — call it inside `setup()` after registering the builder types.
 *
 * Ref: rule-domain-model.md "The type discriminator in the public model"
 */

import { z } from '@kbn/zod/v4';
import { customQueryCreateSchema, thresholdCreateSchema } from './detection_rule_request_schemas';

// ---------------------------------------------------------------------------
// Map entry type
// ---------------------------------------------------------------------------

/** One entry in the alias map. */
export interface AliasMapEntry {
  /** Short public alias as it appears in the wire `type` field. */
  alias: 'query' | 'threshold';
  /** Namespaced builder type id registered with the framework. */
  builderTypeId: string;
  /** Every detection rule pins `kind: 'signal'`. */
  kind: 'signal';
  /**
   * Zod schema for creating a rule of this type.
   * Routes use it for request validation; the converter uses it to determine
   * which per-type fields are valid for a merged PATCH.
   */
  createSchema: z.ZodType;
}

// ---------------------------------------------------------------------------
// The static map
//
// Adding a detection type: add one entry here with the new alias, the new
// builder type id, and the new create schema.  The bijectivity check will
// then require that the new type is also registered in plugin `setup()`.
// ---------------------------------------------------------------------------

const ALIAS_MAP_ENTRIES: AliasMapEntry[] = [
  {
    alias: 'query',
    builderTypeId: 'security.detection.query',
    kind: 'signal',
    createSchema: customQueryCreateSchema,
  },
  {
    alias: 'threshold',
    builderTypeId: 'security.detection.threshold',
    kind: 'signal',
    createSchema: thresholdCreateSchema,
  },
];

// ---------------------------------------------------------------------------
// Derived lookup tables
// ---------------------------------------------------------------------------

/**
 * Alias → builder type id.
 * Use this to look up the framework id from the wire alias.
 */
export const ALIAS_TO_BUILDER_TYPE_ID: Readonly<Record<'query' | 'threshold', string>> =
  Object.fromEntries(ALIAS_MAP_ENTRIES.map((e) => [e.alias, e.builderTypeId])) as Record<
    'query' | 'threshold',
    string
  >;

/**
 * Builder type id → alias.
 * Use this to look up the wire alias from the stored builder type.
 */
export const BUILDER_TYPE_ID_TO_ALIAS: Readonly<Record<string, 'query' | 'threshold'>> =
  Object.fromEntries(ALIAS_MAP_ENTRIES.map((e) => [e.builderTypeId, e.alias])) as Record<
    string,
    'query' | 'threshold'
  >;

/**
 * Alias → kind.
 * Use this to look up the pinned kind from the wire alias.
 * Converters should read kind from here rather than hardcoding it, so that
 * adding a future alias with a different pin requires no change to the converter.
 */
export const ALIAS_TO_KIND: Readonly<Record<'query' | 'threshold', 'alert' | 'signal'>> =
  Object.fromEntries(ALIAS_MAP_ENTRIES.map((e) => [e.alias, e.kind])) as Record<
    'query' | 'threshold',
    'alert' | 'signal'
  >;

/**
 * All alias map entries as an array.
 * Use this when you need to iterate over all known detection types.
 */
export const ALIAS_MAP: ReadonlyArray<AliasMapEntry> = ALIAS_MAP_ENTRIES;

/**
 * All known public type aliases, as a Zod enum.
 * Use this in schemas that need to enumerate valid `type` values.
 */
export const detectionRuleTypeSchema = z.enum(['query', 'threshold']);
export type DetectionRuleType = z.infer<typeof detectionRuleTypeSchema>;

// ---------------------------------------------------------------------------
// Startup bijectivity check
//
// Called in plugin setup() after registerBuilderType() calls.
// Throws if:
//   1. Any alias's builder type id is not in the registered set.
//   2. Two different aliases map to the same builder type id.
//      (The map's structure prevents this by construction, but the check
//       makes the invariant explicit and catches copy-paste errors.)
//
// Ref: rule-domain-model.md "The type discriminator in the public model"
// ---------------------------------------------------------------------------

/**
 * Verify that the alias map is bijective against the set of registered builder
 * type ids.  Throws an `Error` with a descriptive message on the first
 * violation found.
 *
 * Call this in plugin `setup()` after all `registerBuilderType()` calls.
 *
 * @param registeredTypeIds - The set of builder type ids actually registered
 *   with the framework (from the setup contract).
 */
export function assertAliasBijectivity(registeredTypeIds: ReadonlySet<string>): void {
  const seenBuilderTypeIds = new Set<string>();

  for (const entry of ALIAS_MAP_ENTRIES) {
    // Check 1: no two aliases share a builder type id.
    if (seenBuilderTypeIds.has(entry.builderTypeId)) {
      throw new Error(
        `Detection rule alias map is not bijective: builder type id '${entry.builderTypeId}' ` +
          `is mapped by more than one alias. Each alias must resolve to a distinct builder type.`
      );
    }
    seenBuilderTypeIds.add(entry.builderTypeId);

    // Check 2: every alias resolves to a registered builder type.
    if (!registeredTypeIds.has(entry.builderTypeId)) {
      throw new Error(
        `Detection rule alias '${entry.alias}' maps to builder type ` +
          `'${entry.builderTypeId}' which is not registered with the framework. ` +
          `Register the type via alertingVTwo.registerBuilderType() before calling ` +
          `assertAliasBijectivity().`
      );
    }
  }
}
