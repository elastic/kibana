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

export interface HuntingLead {
  id: string;
  title: string;
  byline: string;
  description: string;
  entities: Array<{ type: string; name: string }>;
  tags: string[];
  priority: number;
  chatRecommendations: string[];
  timestamp: string;
  staleness: 'fresh' | 'stale' | 'expired';
  status: 'active' | 'dismissed' | 'expired';
  observations: Observation[];
  sourceType: 'adhoc' | 'scheduled';
}

export interface ApiLead extends HuntingLead {
  executionUuid: string;
}

export const fromApiLead = (lead: ApiLead): HuntingLead => ({
  id: lead.id,
  title: lead.title,
  byline: lead.byline,
  description: lead.description,
  entities: lead.entities,
  tags: lead.tags,
  priority: lead.priority,
  chatRecommendations: lead.chatRecommendations,
  timestamp: lead.timestamp,
  staleness: lead.staleness,
  status: lead.status,
  observations: lead.observations,
  sourceType: lead.sourceType,
});
