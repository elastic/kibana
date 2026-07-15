/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';

export type EsQuery = GraphRequest['query']['esQuery'];

export interface OriginEventId {
  id: string;
  isAlert: boolean;
}

/**
 * Common services interface for document details context.
 * Used by graph_entities and graph_events routes.
 */
export interface DocumentDetailsContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

// Constants for non-enriched entity types
export const NON_ENRICHED_ENTITY_TYPE_PLURAL = 'Entities';
export const NON_ENRICHED_ENTITY_TYPE_SINGULAR = 'Entity';

/**
 * Base interface for graph edges with shared actor/target fields.
 * Extended by EventEdge and RelationshipEdge.
 */
export interface GraphEdge {
  badge: number;
  // Actor attributes (shared)
  actorNodeId: string;
  actorIdsCount: number;
  actorEntityType?: string | null;
  actorEntitySubType?: string | null;
  actorEntityName?: string | string[] | null;
  actorHostIps?: string[] | string;
  actorsDocData?: Array<string | null> | string;
  // Target attributes (shared)
  targetNodeId: string | null;
  targetIdsCount: number;
  targetEntityType?: string | null;
  targetEntitySubType?: string | null;
  targetEntityName?: string | string[] | null;
  targetHostIps?: string[] | string;
  targetsDocData?: Array<string | null> | string;
}

/**
 * Represents an event/alert edge after TypeScript regrouping by
 * (action, actorType, actorSubType, targetType, targetSubType, isOrigin, isOriginAlert, pinned).
 * This is the post-regroup shape returned to the API caller.
 */
export interface EventEdge extends GraphEdge {
  // Event/alert attributes
  action: string;
  docs: string[] | string;
  isAlert: boolean;
  isOrigin: boolean;
  isOriginAlert: boolean;
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
  sourceIps?: string[] | string;
  sourceCountryCodes?: string[] | string;
  /**
   * Unique identifier for the label node based on document IDs.
   * This ensures that label nodes are deduplicated by documents, not by actor-target pairs.
   * When a single document expands via MV_EXPAND into multiple rows with different entity types,
   * they should share the same label node because they originate from the same document(s).
   */
  labelNodeId: string;
  pinned?: string | null;
}

/**
 * Row returned by the events ES|QL query AFTER in-query STATS pre-aggregation.
 * One row per (action × actorEntityId × targetEntityId × isOrigin × isOriginAlert × pinned)
 * group. Multi-value aggregate columns (docs, docIds, sourceIps, …) collapse the many raw
 * documents that share that key. regroupEvents performs the final merge by entity type/sub-type
 * (which is only known after the follow-up enrichment query).
 */
export interface EventEsqlRow {
  action: string;
  actorEntityId: string | string[];
  targetEntityId: string | string[] | null;
  isOrigin: boolean;
  isOriginAlert: boolean;
  isAlert: boolean;
  pinned: string | null;
  badge: number;
  docs: string | string[];
  docIds: string | string[] | null;
  alertDocIds: string | string[] | null;
  nonAlertDocIds: string | string[] | null;
  sourceIps?: string | string[] | null;
  sourceCountryCodes?: string | string[] | null;
  actorDocData: string | string[];
  targetDocData: string | string[];
  /**
   * Per-target → source-document mapping, one entry per (target, doc) pair, encoded as
   * "<targetEntityId>\n<_id>". Lets regroupEvents attribute each target to the document(s)
   * that referenced it after the STATS pre-aggregation drops targetEntityId from the group key,
   * so label nodes stay split by document just as they would be if grouping by targetEntityId.
   */
  targetDocMap: string | string[];
}

/**
 * Represents a relationship edge after TypeScript regrouping by
 * (actorNodeId, relationship, targetType, targetSubType).
 * Used for static/configuration-based relationships between entities.
 */
export interface RelationshipEdge extends GraphEdge {
  relationship: string; // "Owns", "Supervises", "Depends_on", etc.
  relationshipNodeId: string; // Unique ID for deduplication (actorId-relationship)
  // Actor entity grouping (relationship-specific)
  actorIds: string[]; // All actor entity IDs in this group
  // Target entity grouping (relationship-specific)
  targetNodeId: string; // Override to make non-nullable for relationships
  targetIds: string[]; // All target entity IDs in this group
}

/**
 * Row returned by the relationships ES|QL query AFTER in-query STATS pre-aggregation.
 * One row per (actorEntityType × actorEntitySubType × relationship × pinned) group — same-type
 * actors are already merged here (`actorIds`) and every target the group points at is collected
 * in `targetIds` (multi-value). `badge` is the count of raw FORK/MV_EXPAND rows collapsed into
 * the row. regroupRelationships performs the final split/merge by target type/sub-type (only
 * known after the follow-up enrichment query).
 */
export interface RelationshipEsqlRow {
  actorIds: string | string[];
  actorEntityType?: string | null;
  actorEntitySubType?: string | null;
  actorEntityName?: string | string[] | null;
  actorHostIps?: string[] | string | null;
  actorDocData: string | string[];
  relationship: string;
  targetIds: string | string[];
  targetDocData: string | string[];
  /**
   * Per-row actor → target mapping, one entry per (actor, target) pair, encoded as
   * "<actorId>\n<targetId>". Lets regroupRelationships recover which actor pointed at which
   * target after the STATS pre-aggregation drops actorId/targetId from the group key, so a
   * merged same-type-actor row can be split back into distinct relationship nodes when the
   * actors point at different target sets.
   */
  actorTargetMap: string | string[];
  pinned?: string | null;
  badge: number;
}

export interface EntityRecord {
  id: string;
  name: string;
  type: string;
  sub_type: string;
  docData: string;
}

/**
 * Entity ID with type for relationship queries.
 */
export type EntityId = NonNullable<GraphRequest['query']['entityIds']>[number];
