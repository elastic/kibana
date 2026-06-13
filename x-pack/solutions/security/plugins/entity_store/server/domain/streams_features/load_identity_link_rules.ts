/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';

/**
 * A deterministic, evidence-backed identity-link *rule* parsed from a
 * `type: 'entity'` Knowledge Indicator's `properties.identity_link_rule` (see
 * the Streams feature system prompt).
 *
 * Where {@link IdentityLinkClue} carries the concrete `(user_name, user_email)`
 * values for a single person, a rule names the *fields* that carry that
 * relationship for EVERY user in the stream:
 *  - `userNameField` holds the local / service login (e.g. `user.name`);
 *  - `userEmailField` holds the authoritative email / UPN for the same person
 *    (e.g. `user.email`, or an SSO field such as `github.external_identity_nameid`).
 *
 * Downstream resolution executes the rule deterministically (one ES|QL
 * aggregation over the whole stream) to materialize a clue for every user,
 * closing the coverage gap left by LLM sampling.
 */
export interface IdentityLinkRule {
  /** Field whose value is the local / service login (e.g. `user.name`). */
  userNameField: string;
  /** Field whose value is the authoritative email / UPN for the same person. */
  userEmailField: string;
  /** Optional IdP / directory namespace hint (e.g. `okta`), lower-cased. */
  namespaceHint?: string;
  /**
   * Optional scope condition (the feature's `filter`) restricting which
   * documents the rule applies to (e.g. only `iam` / SSO events carry the
   * email). Undefined means the rule applies to every document in the stream.
   */
  filter?: Condition;
  /** Stable feature identifier (for provenance / telemetry / logs). */
  featureUuid: string;
  /** Stream the rule was observed on. */
  streamName: string;
  /** KI confidence (0–100) of the source feature. */
  confidence: number;
}

export interface LoadIdentityLinkRulesOptions {
  /**
   * Confidence floor (0–100). Features below this are dropped. The floor is
   * pushed down into the Streams query AND re-applied client-side so a mocked
   * or non-filtering reader cannot leak low-confidence rules.
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
 * Parses and validates the `properties.identity_link_rule` object of a single
 * `entity` feature. Returns `undefined` when the feature does not carry a
 * well-formed rule (missing object, or missing/blank `user_name_field` /
 * `user_email_field`). Malformed rules are skipped, never guessed.
 *
 * Field *names* are intentionally NOT lower-cased — ES field paths are
 * case-sensitive — but the optional `namespace_hint` is, to match the
 * case-insensitive matching used elsewhere in the resolver.
 */
export const parseIdentityLinkRule = (feature: Feature): IdentityLinkRule | undefined => {
  const properties = asRecord(feature.properties);
  const rule = asRecord(properties?.identity_link_rule);
  if (!rule) {
    return undefined;
  }

  const userNameField = asNonEmptyString(rule.user_name_field);
  const userEmailField = asNonEmptyString(rule.user_email_field);
  if (!userNameField || !userEmailField || userNameField === userEmailField) {
    return undefined;
  }

  const namespaceHint = asNonEmptyString(rule.namespace_hint);

  return {
    userNameField,
    userEmailField,
    ...(namespaceHint ? { namespaceHint: namespaceHint.toLowerCase() } : {}),
    ...(feature.filter ? { filter: feature.filter } : {}),
    featureUuid: feature.uuid,
    streamName: feature.stream_name,
    confidence: feature.confidence,
  };
};

/**
 * Reads `type: 'entity'` Knowledge Indicators across the authorized streams and
 * returns the deterministic identity-link rules they carry, confidence-gated
 * and deduplicated.
 *
 * Behavior:
 * - Pushes `minConfidence` into the reader query and re-applies it client-side.
 * - Skips features whose `properties.identity_link_rule` is absent or malformed.
 * - Deduplicates by `(streamName, userNameField, userEmailField)`, keeping the
 *   highest-confidence source feature (alphabetical `featureUuid` tiebreaker for
 *   determinism). A given stream rarely needs more than one rule, but the same
 *   rule can be re-discovered across runs.
 */
export const loadIdentityLinkRules = async (
  reader: StreamsKnowledgeIndicatorsReader,
  options: LoadIdentityLinkRulesOptions,
  logger: Logger
): Promise<IdentityLinkRule[]> => {
  const { minConfidence } = options;
  const features = await reader.listEntityFeatures({ minConfidence });

  const byKey = new Map<string, IdentityLinkRule>();
  let skippedMalformed = 0;
  let skippedLowConfidence = 0;

  for (const feature of features) {
    if (typeof minConfidence === 'number' && feature.confidence < minConfidence) {
      skippedLowConfidence++;
      continue;
    }

    const rule = parseIdentityLinkRule(feature);
    if (!rule) {
      skippedMalformed++;
      continue;
    }

    const key = `${rule.streamName}\u0000${rule.userNameField}\u0000${rule.userEmailField}`;
    const existing = byKey.get(key);
    if (
      !existing ||
      rule.confidence > existing.confidence ||
      (rule.confidence === existing.confidence && rule.featureUuid < existing.featureUuid)
    ) {
      byKey.set(key, rule);
    }
  }

  const rules = Array.from(byKey.values());
  logger.debug(
    `loadIdentityLinkRules: ${rules.length} rule(s) from ${features.length} entity feature(s) ` +
      `(skipped ${skippedMalformed} malformed, ${skippedLowConfidence} below confidence floor)`
  );

  return rules;
};
