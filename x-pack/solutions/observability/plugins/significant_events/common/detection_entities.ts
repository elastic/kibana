/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DetectionEntity {
  id: string;
  name: string;
  subtype: string;
  source_ids: string[];
  rules: number;
  active_events: number;
}

export interface DetectionEntitiesResponse {
  entities: DetectionEntity[];
  // Null when the entity list is truncated: entities past the cap would count as unassigned.
  unassigned: { rules: number; active_events: number } | null;
  truncated: boolean;
}
