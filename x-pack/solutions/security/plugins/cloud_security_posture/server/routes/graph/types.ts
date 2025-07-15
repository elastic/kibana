/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';

export type EsQuery = GraphRequest['query']['esQuery'];

export interface OriginEventId {
  id: string;
  isAlert: boolean;
}

export interface GraphEdge {
  badge: number;
  docs: string[] | string;
  ips?: string[] | string;
  hosts?: string[] | string;
  users?: string[] | string;
  actorIds: string[] | string;
  action: string;
  targetIds: Array<string | null> | string;
  isOrigin: boolean;
  isOriginAlert: boolean;
}
