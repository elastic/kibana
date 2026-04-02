/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CompositeAfterKey {
  [key: string]: string | null;
}

export interface CompositeBucket {
  key: CompositeAfterKey;
  doc_count: number;
}

export interface ProcessedEntityRecord {
  /** Full EUID with type prefix, e.g. "user:alice@acme.com@entra_id". */
  entityId: string | null;
  /** The entity type of the actor (e.g. "user"). */
  entityType: string;
  /** Plain EUID strings, e.g. "service:s3.amazonaws.com". */
  communicates_with: string[];
}
