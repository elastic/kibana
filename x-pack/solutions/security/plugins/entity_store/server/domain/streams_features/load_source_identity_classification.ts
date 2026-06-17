/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import {
  ENTITY_CONFIDENCE,
  type EntityConfidence,
} from '../../../common/domain/definitions/user_entity_constants';
import { ENTITY_TYPE_IDENTITY_FIELDS } from './load_per_type_source_indices';

/**
 * The per-source identity classification the entity store applies to user
 * extraction in place of the rule-based `idpGate` / namespace allowlist /
 * confidence rules in `user.ts`. Derived from a `schema`-class Knowledge
 * Indicator's `properties.identity_classification`, never persisted.
 */
export interface SourceIdentityClassification {
  /**
   * Identity-system namespace that feeds the user `euidRanking` branches and
   * `entity.namespace`. `local` selects the host-user (medium) EUID form
   * (`user.name@host.id@local`); any other value selects the directory form
   * (`user.email@namespace`).
   */
  namespace: string;
  /** `high` for authoritative IdP streams, `medium` for host-agent observations. */
  tier: EntityConfidence;
}

/** Provenance for the visibility surface: which stream/feature classified a source, and how. */
export interface IdentityClassificationProvenance extends SourceIdentityClassification {
  streamName: string;
  indexPatterns: string[];
  featureUuid: string;
  /** The schema feature's own LLM confidence (0–100), distinct from the entity `tier`. */
  confidence: number;
}

export interface LoadedIdentityClassification {
  /** One entry per qualifying stream. Drives per-source preludes and the visibility route. */
  classifications: IdentityClassificationProvenance[];
  /**
   * Flat lookup keyed by resolved index pattern, for the ESQL classification
   * prelude builder. A pattern that appears for multiple streams resolves to the
   * classification of the highest-confidence feature (see conflict handling).
   */
  byIndexPattern: Map<string, SourceIdentityClassification>;
}

export interface LoadSourceIdentityClassificationOptions {
  /**
   * Confidence floor pushed into the schema-feature query. When `null` the
   * loader short-circuits and returns empty classification WITHOUT any I/O —
   * the "confidence classification disabled" branch the config flag defaults to.
   */
  minConfidence: number | null;
}

const USER_IDENTITY_FIELDS: readonly string[] = ENTITY_TYPE_IDENTITY_FIELDS.user;

const VALID_TIERS: ReadonlySet<string> = new Set<string>([
  ENTITY_CONFIDENCE.High,
  ENTITY_CONFIDENCE.Medium,
]);

const emptyResult = (): LoadedIdentityClassification => ({
  classifications: [],
  byIndexPattern: new Map(),
});

/**
 * Parses and validates `properties.identity_classification` from a schema
 * feature. Returns `undefined` when the property is absent or malformed (so a
 * hallucinated / partial object cannot classify a stream):
 * - `confidence_tier` MUST be `"high"` or `"medium"`.
 * - `namespace` MUST be a non-empty string.
 */
const parseIdentityClassification = (
  feature: Feature
): SourceIdentityClassification | undefined => {
  const properties =
    feature.properties && typeof feature.properties === 'object'
      ? (feature.properties as Record<string, unknown>)
      : undefined;
  const raw = properties?.identity_classification;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const { confidence_tier: tier, namespace } = raw as Record<string, unknown>;
  if (typeof tier !== 'string' || !VALID_TIERS.has(tier)) {
    return undefined;
  }
  if (typeof namespace !== 'string' || namespace.trim().length === 0) {
    return undefined;
  }
  return { namespace: namespace.trim(), tier: tier as EntityConfidence };
};

/** Union of every identity field across all entity types, used to scan a schema feature's properties/evidence. */
const ALL_IDENTITY_FIELDS: readonly string[] = Array.from(
  new Set(Object.values(ENTITY_TYPE_IDENTITY_FIELDS).flat())
);

/**
 * Derives which ECS identity fields a `schema`-class feature surfaces for its
 * stream. Three signals are combined (any hit counts as present):
 *
 * 1. `properties.entity_field_presence` — an explicit object the LLM may emit;
 *    values are intersected with the known identity vocabulary so a
 *    hallucinated field cannot qualify a stream.
 * 2. `properties.ecs_identity_aliases` — its KEYS are ECS identity destinations
 *    the stream can populate (the alias table).
 * 3. `evidence` strings — deterministic fallback: any identity field name that
 *    appears verbatim in an evidence string.
 *
 * This lives here (rather than in `load_per_type_source_indices`, which now
 * derives presence from deterministic `dataset_analysis` features) because the
 * confidence-classification channel reads LLM-emitted `schema` features.
 */
const deriveSchemaFeatureIdentityPresence = (feature: Feature): ReadonlySet<string> => {
  const present = new Set<string>();
  const properties =
    feature.properties && typeof feature.properties === 'object'
      ? (feature.properties as Record<string, unknown>)
      : undefined;

  const rawPresence = properties?.entity_field_presence;
  if (rawPresence && typeof rawPresence === 'object' && !Array.isArray(rawPresence)) {
    for (const value of Object.values(rawPresence as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      for (const field of value) {
        if (typeof field === 'string' && ALL_IDENTITY_FIELDS.includes(field)) {
          present.add(field);
        }
      }
    }
  }

  const rawAliases = properties?.ecs_identity_aliases;
  if (rawAliases && typeof rawAliases === 'object' && !Array.isArray(rawAliases)) {
    for (const key of Object.keys(rawAliases as Record<string, unknown>)) {
      if (ALL_IDENTITY_FIELDS.includes(key)) {
        present.add(key);
      }
    }
  }

  if (Array.isArray(feature.evidence)) {
    for (const line of feature.evidence) {
      if (typeof line !== 'string') continue;
      for (const field of ALL_IDENTITY_FIELDS) {
        if (line.includes(field)) {
          present.add(field);
        }
      }
    }
  }

  return present;
};

/** True when the feature surfaces at least one user identity field (rubric eligibility, enforced defensively). */
const carriesUserIdentity = (feature: Feature): boolean => {
  const presence = deriveSchemaFeatureIdentityPresence(feature);
  return USER_IDENTITY_FIELDS.some((field) => presence.has(field));
};

/**
 * Loads the per-source user identity classification for the current run,
 * derived automatically from whatever `schema`-class Knowledge Indicators carry
 * `properties.identity_classification`. There is no operator registry/toggle:
 * every qualifying stream's classification is applied.
 *
 * Behavior:
 * - `minConfidence === null` → returns empty classification, no I/O (disabled branch).
 * - Otherwise lists schema features above threshold, keeps those that both carry
 *   a valid `identity_classification` and surface a user identity field, resolves
 *   their index patterns, and returns per-stream provenance plus a flat
 *   index-pattern → classification map for the prelude builder.
 * - Conflict handling: when one stream has multiple valid classifications across
 *   features, the highest-confidence feature wins (ties keep the first seen) and
 *   a debug line is logged.
 */
export const loadSourceIdentityClassification = async (
  reader: StreamsKnowledgeIndicatorsReader,
  options: LoadSourceIdentityClassificationOptions,
  logger: Logger
): Promise<LoadedIdentityClassification> => {
  if (options.minConfidence === null) {
    return emptyResult();
  }

  const features = await reader.listSchemaFeatures({ minConfidence: options.minConfidence });
  if (features.length === 0) {
    return emptyResult();
  }

  // Pick the winning classification per stream (highest feature confidence).
  const winnerByStream = new Map<
    string,
    { feature: Feature; classification: SourceIdentityClassification }
  >();
  for (const feature of features) {
    const classification = parseIdentityClassification(feature);
    if (!classification) {
      continue;
    }
    if (!carriesUserIdentity(feature)) {
      continue;
    }
    const current = winnerByStream.get(feature.stream_name);
    if (!current) {
      winnerByStream.set(feature.stream_name, { feature, classification });
      continue;
    }
    if (feature.confidence > current.feature.confidence) {
      logger.debug(
        `[entity_store] Conflicting identity_classification for stream ${feature.stream_name}; ` +
          `preferring higher-confidence feature (${feature.confidence} > ${current.feature.confidence})`
      );
      winnerByStream.set(feature.stream_name, { feature, classification });
    }
  }

  if (winnerByStream.size === 0) {
    return emptyResult();
  }

  const classifications: IdentityClassificationProvenance[] = [];
  const byIndexPattern = new Map<string, SourceIdentityClassification>();

  await Promise.all(
    Array.from(winnerByStream.entries()).map(async ([streamName, { feature, classification }]) => {
      let indexPatterns: string[];
      try {
        indexPatterns = await reader.resolveIndexPatterns(streamName);
      } catch (error) {
        logger.warn(
          `[entity_store] Failed to resolve index patterns for stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }; this stream will be skipped for identity classification`
        );
        return;
      }
      if (indexPatterns.length === 0) {
        return;
      }
      classifications.push({
        streamName,
        indexPatterns,
        featureUuid: feature.uuid,
        confidence: feature.confidence,
        namespace: classification.namespace,
        tier: classification.tier,
      });
      for (const pattern of indexPatterns) {
        byIndexPattern.set(pattern, classification);
      }
    })
  );

  // Stable order for deterministic prelude output and snapshots.
  classifications.sort((a, b) => a.streamName.localeCompare(b.streamName));

  return { classifications, byIndexPattern };
};
