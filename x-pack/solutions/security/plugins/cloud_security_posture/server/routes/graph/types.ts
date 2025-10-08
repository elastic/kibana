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
  // event/alert attributes
  action: string;
  docs: string[] | string;
  isAlert: boolean;
  isOrigin: boolean;
  isOriginAlert: boolean;
  badge: number;
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
  sourceIps?: string[] | string;
  sourceCountryCodes?: string[] | string;
  // actor attributes
  actorIds: string[] | string;
  actorIdsCount: number;
  actorsDocData?: Array<string | null> | string;
  actorEntityGroup: string;
  actorEntityType: string;
  actorLabel: string;
  actorHostIps?: string[] | string;
  // target attributes
  targetIds: Array<string | null> | string;
  targetIdsCount: number;
  targetsDocData?: Array<string | null> | string;
  targetEntityGroup?: string;
  targetEntityType: string;
  targetLabel: string;
  targetHostIps?: string[] | string;
}
