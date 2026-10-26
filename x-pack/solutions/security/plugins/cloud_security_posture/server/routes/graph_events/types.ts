/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raw event/alert record from ESQL query
 */
export interface EventRecord {
  docId: string;
  eventId?: string | null;
  index?: string | null;
  timestamp?: string | null;
  action?: string | null;
  isAlert?: boolean | null;
  actorEntityId?: string | null;
  actorEcsParentField?: string | null;
  actorEntityName?: string | null;
  targetEntityId?: string | null;
  targetEcsParentField?: string | null;
  targetEntityName?: string | null;
  sourceIps?: string[] | string | null;
  sourceCountryCodes?: string[] | string | null;
}
