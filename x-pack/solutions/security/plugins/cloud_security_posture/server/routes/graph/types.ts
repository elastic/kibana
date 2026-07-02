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
 * Raw per-triple row returned by the events ES|QL query before TypeScript
 * regrouping. One row per (event _id × MV_EXPAND'd actor × MV_EXPAND'd target);
 * all aggregation (badge, uniqueEventsCount, etc.) happens later in regroupEvents.
 */
export interface EventEsqlRow {
  _id: string;
  action: string;
  actorEntityId: string;
  targetEntityId: string | null;
  isOrigin: boolean;
  isOriginAlert: boolean;
  isAlert: boolean;
  pinned: string | null;
  docData: string;
  sourceIps?: string | string[] | null;
  sourceCountryCodes?: string | string[] | null;
  actorDocData: string;
  targetDocData: string;
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
 * Raw per-triple row returned by the relationships ES|QL query before TypeScript
 * regrouping. One row per (entity.id × relationship leaf × _target_id) tuple;
 * aggregation (badge, *IdsCount) happens later in regroupRelationships.
 */
export interface RelationshipEsqlRow {
  actorId: string;
  actorEntityType?: string | null;
  actorEntitySubType?: string | null;
  actorEntityName?: string | string[] | null;
  actorHostIps?: string[] | string | null;
  actorDocData: string;
  relationship: string;
  relationshipNodeId: string;
  targetId: string;
  targetDocData: string;
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
