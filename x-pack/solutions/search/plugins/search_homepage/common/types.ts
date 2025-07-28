/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiKey } from '@kbn/security-plugin-types-common';

export interface IndicesStatusResponse {
  indexNames: string[];
}

export interface UserStartPrivilegesResponse {
  privileges: {
    canCreateApiKeys: boolean;
    canManageIndex: boolean;
    canDeleteDocuments: boolean;
  };
}

export interface ApiKeysResponse {
  apiKeys: ApiKey[];
  canManageOwnApiKey: boolean;
}
