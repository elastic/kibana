/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PrivMonUserSource = 'csv' | 'api' | 'index_sync';

export interface PrivMonBulkUser {
  username: string;
  indexName: string;
  existingUserId?: string;
}

// For update metadata
export interface BulkUpdateOperation {
  update: {
    _index: string;
    _id: string;
  };
}

// For the Painless script used in updates
export interface BulkScriptOperation {
  script: {
    source: string;
    params: {
      index: string;
    };
  };
}

// For create (index) metadata
export interface BulkIndexOperation {
  index: {
    _index: string;
  };
}

// For the actual document to insert (new user)
export interface BulkDocumentBody {
  user: {
    name: string;
    is_privileged: boolean;
  };
  labels: {
    sources: string[];
    source_indices: string[];
  };
}

// Union of all operation parts
export type BulkOperation =
  | BulkUpdateOperation
  | BulkScriptOperation
  | BulkIndexOperation
  | BulkDocumentBody;
