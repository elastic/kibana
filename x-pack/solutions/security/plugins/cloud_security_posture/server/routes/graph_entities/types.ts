/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raw entity record from ESQL query
 */
export interface EntityRecord {
  entityId: string;
  entityName?: string | null;
  entityType?: string | null;
  entitySubType?: string | null;
  hostIp?: string | null;
  ecsParentField?: string | null;
  availableInEntityStore?: boolean | null;
  timestamp?: string | null;
  sourceIps?: string[] | string | null;
  sourceCountryCodes?: string[] | string | null;
}
