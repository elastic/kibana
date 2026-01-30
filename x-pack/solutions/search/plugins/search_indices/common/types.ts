/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingFieldType } from '@elastic/elasticsearch/lib/api/types';

export interface Field {
  name: string;
  type: MappingFieldType;
  properties?: { [key: string]: Omit<Field, 'name'> };
  fields?: Fields;
  inference_id?: string | undefined;
}

export interface Fields {
  [key: string]: Omit<Field, 'name'>;
}

export interface IndicesStatusResponse {
  indexNames: string[];
}

export interface OnboardingTokenResponse {
  token: string | null;
}

export interface UserStartPrivilegesResponse {
  privileges: {
    canCreateApiKeys: boolean;
    canManageIndex: boolean;
    canDeleteDocuments: boolean;
  };
}

export interface CreateIndexRequest {
  indexName: string;
}

export interface CreateIndexResponse {
  index: string;
}

export interface UpdateIndexMappingsRequest {
  indexName: string;
  fields: Fields;
}
