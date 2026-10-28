/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Observation {
  entityId: string;
  moduleId: string;
  type: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  metadata: Record<string, unknown>;
}

export interface RelatedEntity {
  id: string;
  type: string;
  name: string;
  kinds: string[];
  riskLevel?: string;
  criticality?: string;
  interactedWithAtLeast?: number;
}

export interface HuntingLead {
  id: string;
  title: string;
  byline: string;
  description: string;
  entity: { type: string; name: string; id: string };
  tags: string[];
  priority: number;
  chatRecommendations: string[];
  timestamp: string;
  staleness: 'fresh' | 'stale' | 'expired';
  status: 'active' | 'dismissed' | 'expired';
  observations: Observation[];
  sourceType: 'adhoc' | 'scheduled';
  topRelatedEntities: RelatedEntity[];
  relatedEntityCounts: Record<string, number>;
  origin: 'observations' | 'exploratory';
}

export interface ApiLead extends HuntingLead {
  executionUuid: string;
}

export const fromApiLead = (lead: ApiLead): HuntingLead => ({
  id: lead.id,
  title: lead.title,
  byline: lead.byline,
  description: lead.description,
  entity: lead.entity,
  tags: lead.tags,
  priority: lead.priority,
  chatRecommendations: lead.chatRecommendations,
  timestamp: lead.timestamp,
  staleness: lead.staleness,
  status: lead.status,
  observations: lead.observations,
  sourceType: lead.sourceType,
  topRelatedEntities: lead.topRelatedEntities,
  relatedEntityCounts: lead.relatedEntityCounts,
  origin: lead.origin,
});
