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

export interface GraphEdge {
  badge: number;
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
  actorIdsCount: number;
  targetIdsCount: number;
  docs: string[] | string;
  actorIds: string[] | string;
  action: string;
  targetIds: Array<string | null> | string;
  isOrigin: boolean;
  isOriginAlert: boolean;
  isAlert: boolean;
  actorsDocData?: Array<string | null> | string;
  targetsDocData?: Array<string | null> | string;
  actorEntityGroup?: string;
  targetEntityGroup?: string;
  actorEntityType?: string | null;
  targetEntityType?: string | null;
  actorLabel: string;
  targetLabel: string;
  hostIps: string[] | string;
  hostCountryCodes: string[] | string;
  sourceIps: string[] | string;
  sourceCountryCodes: string[] | string;
}
