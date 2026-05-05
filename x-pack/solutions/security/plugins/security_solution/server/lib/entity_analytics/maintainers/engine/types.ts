/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityRelationshipKey } from '@kbn/entity-store/common/domain/definitions/common_fields';

export interface CompositeAfterKey {
  [key: string]: string | null;
}

export interface CompositeBucket {
  key: CompositeAfterKey;
  doc_count: number;
}

export type RelationshipType = 'accesses' | 'communicates_with';
export type TargetEntityType = 'host' | 'user' | 'service';

/**
 * Bucket-classification config: actor→target pairs with `COUNT(*) >= threshold`
 * are classified into `aboveThresholdRelationship`, the rest into
 * `belowThresholdRelationship`. Every field is required so the engine carries
 * no implicit data-tuning defaults and bucket relationship keys are declared
 * explicitly at the call site (no engine-level coupling to specific schema
 * field names). Both keys must be members of the entity store's
 * `EntityRelationshipKey` union (TypeScript enforces this).
 */
export interface BucketTargetByThresholdConfig {
  threshold: number;
  aboveThresholdRelationship: EntityRelationshipKey;
  belowThresholdRelationship: EntityRelationshipKey;
}

/**
 * Fields shared by every variant — the engine reads these regardless of
 * whether the config uses the default ES|QL builder or supplies its own
 * override (Step 1 composite-agg discovery always uses these).
 */
interface BaseRelationshipIntegrationFields {
  /** Unique machine-readable identifier, e.g. 'elastic_defend'. */
  id: string;
  /** Human-readable name used in log messages. */
  name: string;
  /** Returns the Elasticsearch index pattern for this integration in the given namespace. */
  indexPattern: (namespace: string) => string;
  /** Which relationship type this config populates. */
  relationshipType: RelationshipType;
  /** Entity type of the relationship target (controls the default target EVAL). */
  targetEntityType: TargetEntityType;
  /**
   * Additional DSL filters applied to the composite aggregation (Step 1).
   * Use this to mirror the same data-shape narrowing that the ES|QL query applies
   * in Step 2 (e.g. event.action / event.outcome term filters), so the actors
   * surfaced in Step 1 actually have matching documents in Step 2.
   */
  compositeAggAdditionalFilters?: QueryDslQueryContainer[];
  /**
   * When true, both Step 1 (composite agg) and Step 2 (ES|QL) require the source
   * document to contain a resolvable EUID for `targetEntityType`. Use this for
   * integrations whose target field is mandatory on every event (e.g. logon
   * events always carry a host). The gate is parameterized by `targetEntityType`,
   * so a user-targeted config with this flag emits a `user.*` existence check
   * and a host-targeted config emits a `host.*` existence check.
   *
   * Setting it makes Step 1 and Step 2 narrow consistently — without it, an
   * `esqlWhereClause` that filters to events with a target EUID would still
   * surface actors in Step 1 who never appear in such events, wasting Step 2
   * work and risking MAX_ITERATIONS exhaustion.
   *
   * Note: this flag affects Step 1 always, but only affects Step 2 for
   * `kind: 'standard'` and `kind: 'bucketed'` (the default ES|QL builder).
   * `kind: 'override'` configs control Step 2 entirely via their override fn.
   */
  requireTargetEntityIdExists?: boolean;
  /**
   * Actor field names used as composite aggregation sources and bucket filter keys.
   * Defaults to ECS user identity fields. Set this for integrations whose actor is
   * not in standard ECS user.* fields (e.g. azure_auditlogs).
   */
  actorFields?: string[];
}

/**
 * Fields used only by the default ES|QL builder (i.e. by `kind: 'standard'`
 * and `kind: 'bucketed'`). Override configs do not carry these because they
 * generate the entire Step 2 query themselves.
 */
interface StandardBuilderFields {
  /**
   * Integration-specific ESQL WHERE clause — the single source of integration-specific
   * query logic. The engine adds only timestamp + actor-identity + (optional)
   * target-EUID existence filters; everything else (event.action, event.outcome,
   * etc.) belongs here.
   */
  esqlWhereClause: string;
  /**
   * Optional ESQL expression for the actor EUID.
   * Defaults to euid.esql.getEuidEvaluation('user', { withTypeId: true }).
   * Required only for integrations with non-ECS actor fields.
   */
  actorEvalOverride?: string;
  /**
   * Optional ESQL expression for the target entity ID.
   * Defaults to euid.esql.getEuidEvaluation(targetEntityType, { withTypeId: true }).
   * Required for integrations with non-standard target fields (e.g. okta,
   * aws_cloudtrail communicates_with).
   */
  targetEvalOverride?: string;
  /**
   * Optional additional filter appended after the standard empty-guard post-EVAL.
   * Use when the target eval can produce non-empty but semantically empty EUIDs.
   * Example: 'AND targetEntityId != "user:@okta"' for okta.
   */
  additionalTargetFilter?: string;
}

/**
 * Standard config: default ES|QL builder, single relationship column named
 * after `relationshipType` (e.g. `communicates_with`).
 */
export interface StandardRelationshipIntegrationConfig
  extends BaseRelationshipIntegrationFields,
    StandardBuilderFields {
  kind: 'standard';
}

/**
 * Bucketed config: default ES|QL builder, two relationship columns based on
 * access-count classification. The `bucketTargetByThreshold` field is required.
 */
export interface BucketedRelationshipIntegrationConfig
  extends BaseRelationshipIntegrationFields,
    StandardBuilderFields {
  kind: 'bucketed';
  bucketTargetByThreshold: BucketTargetByThresholdConfig;
}

/**
 * Override config: integration supplies the entire Step 2 ES|QL query. Use only
 * when the standard builder cannot express the integration's query (e.g.
 * multi-type targets, non-ECS actor fields).
 *
 * The override does NOT receive any of these engine-provided behaviours:
 * - actor / target EUID existence filters in Step 2 (Step 1 still applies them)
 * - getFieldEvaluationsEsql / getEuidEvaluation helpers (future source-field
 *   changes will not propagate automatically)
 * - LIMIT COMPOSITE_PAGE_SIZE ceiling
 *
 * Column contract — the query MUST emit these exact column names or results
 * will be silently empty:
 * - `actorUserId` (string) — the actor's full EUID, e.g. "user:alice@okta"
 * - a column named after `relationshipType` (e.g. `communicates_with`)
 *   (string | string[])
 */
export interface OverrideRelationshipIntegrationConfig extends BaseRelationshipIntegrationFields {
  kind: 'override';
  esqlQueryOverride: (namespace: string) => string;
}

/**
 * Declarative config for one integration feeding a relationship maintainer.
 * The generic engine reads this to build composite agg queries and ES|QL queries
 * without any bespoke TypeScript per integration.
 *
 * Three variants, discriminated on `kind`:
 * - `'standard'`: default ES|QL builder, flat targets list.
 * - `'bucketed'`: default ES|QL builder + access-count classification into
 *   two relationship buckets.
 * - `'override'`: integration supplies the full Step 2 ES|QL query.
 *
 * The variants enforce field invariants at the type level — e.g. it is a
 * compile-time error to declare `bucketTargetByThreshold` on a `'standard'`
 * config or `esqlQueryOverride` on a `'bucketed'` config.
 */
export type RelationshipIntegrationConfig =
  | StandardRelationshipIntegrationConfig
  | BucketedRelationshipIntegrationConfig
  | OverrideRelationshipIntegrationConfig;

/**
 * Output record from the generic postprocessor.
 * Each relationship's targets are stored as optimistic EUIDs computed in the ES|QL layer.
 */
export interface ProcessedEngineRecord {
  /** Full EUID with type prefix, e.g. "user:alice@okta". Null if actor eval failed. */
  entityId: string | null;
  entityType: 'user';
  /**
   * relType → euid[]
   * e.g. { communicates_with: ['host:D3F5C9B9-...', 'user:bob@corp'] }
   */
  relationships: Record<string, string[]>;
}
