/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';

/**
 * A deterministic, evidence-backed identity link parsed from a `type: 'entity'`
 * Knowledge Indicator's `properties.identity_link` (see the Streams feature
 * system prompt). It ties a low-trust local identity token (`userName`,
 * typically an endpoint/OS `user.name`) to an authoritative directory
 * identifier (`userEmail`, a `user.email` / UPN) for the same real person.
 *
 * The KI entity-resolution maintainer consumes these clues to bridge
 * medium-confidence (`local`) user entities that lack a clean `user.email`
 * join key to their high-confidence IdP counterparts — links the existing
 * email-based resolver cannot make on its own.
 */
export interface IdentityLinkClue {
  /** Local identity token, lower-cased for case-insensitive matching. */
  userName: string;
  /** Authoritative email / UPN, lower-cased for case-insensitive matching. */
  userEmail: string;
  /** Optional IdP / directory namespace hint (e.g. `okta`), lower-cased. */
  namespaceHint?: string;
  /** Stable feature identifier (for provenance / telemetry / logs). */
  featureUuid: string;
  /** Stream the clue was observed on. */
  streamName: string;
  /** KI confidence (0–100) of the source feature. */
  confidence: number;
}

export interface LoadEntityResolutionCluesOptions {
  /**
   * Confidence floor (0–100). Features below this are dropped. The floor is
   * pushed down into the Streams query AND re-applied client-side so a mocked
   * or non-filtering reader cannot leak low-confidence clues.
   */
  minConfidence?: number;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

/**
 * Parses and validates the `properties.identity_link` object of a single
 * `entity` feature. Returns `undefined` when the feature does not carry a
 * well-formed link (missing object, missing/blank `user_name` / `user_email`,
 * or an email without an `@`). Malformed links are skipped, never guessed.
 */
export const parseIdentityLinkClue = (feature: Feature): IdentityLinkClue | undefined => {
  const properties = asRecord(feature.properties);
  const link = asRecord(properties?.identity_link);
  if (!link) {
    return undefined;
  }

  const userName = asNonEmptyString(link.user_name);
  const userEmail = asNonEmptyString(link.user_email);
  if (!userName || !userEmail || !userEmail.includes('@')) {
    return undefined;
  }

  const namespaceHint = asNonEmptyString(link.namespace_hint);

  return {
    userName: userName.toLowerCase(),
    userEmail: userEmail.toLowerCase(),
    ...(namespaceHint ? { namespaceHint: namespaceHint.toLowerCase() } : {}),
    featureUuid: feature.uuid,
    streamName: feature.stream_name,
    confidence: feature.confidence,
  };
};

/**
 * Reads `type: 'entity'` Knowledge Indicators across the authorized streams and
 * returns the deterministic identity-link clues they carry, confidence-gated
 * and deduplicated.
 *
 * Behavior:
 * - Pushes `minConfidence` into the reader query and re-applies it client-side.
 * - Skips features whose `properties.identity_link` is absent or malformed.
 * - Deduplicates by `(userName, userEmail)`, keeping the highest-confidence
 *   source feature (alphabetical `featureUuid` tiebreaker for determinism).
 *
 * Conflict handling (one `userName` mapping to different emails) is left to the
 * caller: this loader returns every distinct, valid clue so the maintainer can
 * detect ambiguity against the live entity index and skip rather than mislink.
 */
export const loadEntityResolutionClues = async (
  reader: StreamsKnowledgeIndicatorsReader,
  options: LoadEntityResolutionCluesOptions,
  logger: Logger
): Promise<IdentityLinkClue[]> => {
  const { minConfidence } = options;
  const features = await reader.listEntityFeatures({ minConfidence });

  const byPair = new Map<string, IdentityLinkClue>();
  let skippedMalformed = 0;
  let skippedLowConfidence = 0;

  for (const feature of features) {
    if (typeof minConfidence === 'number' && feature.confidence < minConfidence) {
      skippedLowConfidence++;
      continue;
    }

    const clue = parseIdentityLinkClue(feature);
    if (!clue) {
      skippedMalformed++;
      continue;
    }

    const key = `${clue.userName}\u0000${clue.userEmail}`;
    const existing = byPair.get(key);
    if (
      !existing ||
      clue.confidence > existing.confidence ||
      (clue.confidence === existing.confidence && clue.featureUuid < existing.featureUuid)
    ) {
      byPair.set(key, clue);
    }
  }

  const clues = Array.from(byPair.values());
  logger.debug(
    `loadEntityResolutionClues: ${clues.length} clue(s) from ${features.length} entity feature(s) ` +
      `(skipped ${skippedMalformed} malformed, ${skippedLowConfidence} below confidence floor)`
  );

  return clues;
};
