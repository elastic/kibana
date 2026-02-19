/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';

export type EsQuery = GraphRequest['query']['esQuery'];

export interface OriginEventId {
  id: string;
  isAlert: boolean;
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
 * Represents an event/alert edge from logs and alerts indices.
 * Contains event-specific fields like action, docs, isAlert, etc.
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
}

/**
 * Represents a relationship edge from the entity store.
 * Used for static/configuration-based relationships between entities.
 * Actor and target entities are grouped by type/subtype similar to event actors/targets.
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
 * Entity ID with type for relationship queries.
 */
export type EntityId = NonNullable<GraphRequest['query']['entityIds']>[number];
