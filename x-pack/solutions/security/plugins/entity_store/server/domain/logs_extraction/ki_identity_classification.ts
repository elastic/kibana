/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import {
  type EntityDefinition,
  isSingleFieldIdentity,
} from '../../../common/domain/definitions/entity_schema';
import { escapeEsqlStringLiteral } from '../../../common/esql/strings';
import {
  fieldNotOneOfCondition,
  isNotEmptyCondition,
} from '../../../common/domain/definitions/common_fields';
import {
  LOCAL_NAMESPACE_EXCLUDED_USER_NAMES,
  USER_ENTITY_NAMESPACE,
} from '../../../common/domain/definitions/user_entity_constants';

/**
 * Per-source identity classification consumed by the user-engine extraction
 * query when the KI confidence-classification feature is enabled. This is the
 * query-layer projection of `streams_features` `IdentityClassificationProvenance`
 * — only the fields the ESQL prelude needs.
 */
export interface QueryIdentityClassification {
  /** Resolved index pattern(s) for the classified stream. */
  indexPatterns: string[];
  /** Identity namespace to stamp (`local` selects the host-user EUID form). */
  namespace: string;
  /** `high` | `medium`. */
  tier: string;
}

const ENTITY_NAMESPACE_FIELD = 'entity.namespace';
const ENTITY_CONFIDENCE_FIELD = 'entity.confidence';
const ENTITY_ID_FIELD = 'entity.id';
const INDEX_METADATA_FIELD = '_index';

/**
 * Namespace stamped on rows whose source is not KI-classified (the prelude
 * default arm). These rows are dropped at the creation gate unless they are
 * already-stored entities — see `buildKiClassifiedUserPostAggFilter`.
 */
export const KI_UNCLASSIFIED_NAMESPACE = 'unknown';

/**
 * `_index LIKE` substring matching the backing indices of the entity-store
 * `updates` data stream (`.entities.v2.updates.<space>`). Docs from this stream
 * are already-stored entities being re-extracted; the prelude must preserve
 * their stamped `entity.namespace` / `entity.confidence` rather than overwrite
 * them with the unclassified default.
 */
const UPDATES_STREAM_LIKE = `${INDEX_METADATA_FIELD} LIKE "*.entities.v2.updates*"`;

/** Metadata fields the source clause must request for the classification prelude to work. */
export const IDENTITY_CLASSIFICATION_METADATA_FIELDS: readonly string[] = [INDEX_METADATA_FIELD];

/**
 * Builds a `_index LIKE` predicate matching the concrete backing index of a
 * classified stream. A stream resolves to a data-stream name (e.g.
 * `logs-okta.system-default`) whose docs live in backing indices like
 * `.ds-logs-okta.system-default-2026.01.01-000001`, so we substring-match.
 * A trailing `*` on an explicit pattern is stripped before wrapping.
 */
const likePredicateForPattern = (pattern: string): string => {
  const core = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
  return `${INDEX_METADATA_FIELD} LIKE "*${escapeEsqlStringLiteral(core)}*"`;
};

const matchExpression = (indexPatterns: string[]): string => {
  const predicates = indexPatterns.map(likePredicateForPattern);
  return predicates.length === 1 ? predicates[0] : `(${predicates.join(' OR ')})`;
};

/**
 * Builds the ESQL classification prelude: an `EVAL` that stamps
 * `entity.namespace` and `entity.confidence` per source from the KI
 * classification, in place of the rule-based namespace `fieldEvaluations` and
 * the namespace-derived confidence rules in `user.ts`.
 *
 * Splice this immediately after the source clause and BEFORE the EUID
 * evaluation (the untyped-id EVAL reads `entity.namespace`). The values are
 * set pre-STATS so they flow through the per-field aggregation (`entity.namespace`
 * newest / `entity.confidence` oldest) like the original definition produced.
 *
 * An empty classification list yields `unknown` / `null` for every source
 * except the `updates` data stream (whose stored values are preserved) — the
 * honest "feature on, nothing classified" outcome (no rule-based fallback).
 */
export const buildIdentityClassificationPrelude = (
  classifications: QueryIdentityClassification[]
): string => {
  const namespaceArms: string[] = [];
  const confidenceArms: string[] = [];
  for (const classification of classifications) {
    const match = matchExpression(classification.indexPatterns);
    namespaceArms.push(`${match}, "${escapeEsqlStringLiteral(classification.namespace)}"`);
    confidenceArms.push(`${match}, "${escapeEsqlStringLiteral(classification.tier)}"`);
  }

  // Preserve already-stored entities re-read from the `updates` data stream:
  // their `_index` never matches a classified source, so without this guard the
  // default arm would overwrite their stamped namespace/confidence with the
  // unclassified default (and `entity.namespace` aggregates as newest-wins).
  namespaceArms.push(`${UPDATES_STREAM_LIKE}, ${ENTITY_NAMESPACE_FIELD}`);
  confidenceArms.push(`${UPDATES_STREAM_LIKE}, ${ENTITY_CONFIDENCE_FIELD}`);

  const namespaceExpr = `CASE(${namespaceArms.join(',\n    ')}, "${KI_UNCLASSIFIED_NAMESPACE}")`;
  const confidenceExpr = `CASE(${confidenceArms.join(',\n    ')}, NULL)`;

  return `| EVAL ${ENTITY_NAMESPACE_FIELD} = ${namespaceExpr},\n    ${ENTITY_CONFIDENCE_FIELD} = ${confidenceExpr}`;
};

/**
 * Post-aggregation filter retained under KI classification. It drops the
 * rule-based `idpGate` creation gate (creation is now gated by the presence of
 * a KI classification for the source) but keeps two non-categorization noise
 * filters for the medium / `local` tier, matching the medium-confidence design
 * principles:
 * - require `host.id` for the host-user (`user.name@host.id@local`) EUID form;
 * - exclude shared / service account names.
 *
 * High-confidence (classified, non-`local`) rows are kept; rows left on the
 * unclassified default namespace are dropped (the creation gate that prevents
 * `unknown`-namespace entities).
 * Already-stored entities (`entity.id` exists) are always kept regardless.
 */
const buildKiClassifiedUserPostAggFilter = (): Condition => ({
  or: [
    { field: ENTITY_ID_FIELD, exists: true },
    {
      and: [
        { field: ENTITY_NAMESPACE_FIELD, neq: USER_ENTITY_NAMESPACE.Local },
        { field: ENTITY_NAMESPACE_FIELD, neq: KI_UNCLASSIFIED_NAMESPACE },
      ],
    },
    {
      and: [
        { field: ENTITY_NAMESPACE_FIELD, eq: USER_ENTITY_NAMESPACE.Local },
        isNotEmptyCondition('host.id'),
        fieldNotOneOfCondition('user.name', [...LOCAL_NAMESPACE_EXCLUDED_USER_NAMES]),
      ],
    },
  ],
});

/**
 * Derives the KI-classified variant of the (user) entity definition used when
 * the confidence-classification feature is enabled. The base `user.ts`
 * definition is left untouched (reversibility) — this strips the rule-based
 * categorization from a copy:
 * - removes the namespace `identityField.fieldEvaluations` (the okta/azure/...
 *   allowlist) — the prelude now sets `entity.namespace`;
 * - removes `entity.confidence` from the post-STATS overrides (the prelude now
 *   sets it), preserving the `entity.name` composition entries;
 * - replaces the `idpGate` creation `postAggFilter` with the
 *   noise-filter-only variant above.
 *
 * `euidRanking`, `documentsFilter`, the field list, and the `entity.name`
 * composition are all retained — they consume `entity.namespace` unchanged.
 */
export const deriveKiClassifiedDefinition = (definition: EntityDefinition): EntityDefinition => {
  const identityField = isSingleFieldIdentity(definition.identityField)
    ? definition.identityField
    : { ...definition.identityField, fieldEvaluations: undefined };

  const afterStats = (definition.whenConditionTrueSetFieldsAfterStats ?? [])
    .map((entry) => ({
      ...entry,
      fields: Object.fromEntries(
        Object.entries(entry.fields).filter(([field]) => field !== ENTITY_CONFIDENCE_FIELD)
      ),
    }))
    .filter((entry) => Object.keys(entry.fields).length > 0);

  return {
    ...definition,
    identityField,
    whenConditionTrueSetFieldsAfterStats: afterStats.length > 0 ? afterStats : undefined,
    postAggFilter: buildKiClassifiedUserPostAggFilter(),
  };
};
