/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';
import { HttpStart } from '@kbn/core/public';

export interface ApiParams {
  http: HttpStart;
  signal: AbortSignal;
}
export type ApiPayload<T extends ApiParams> = Omit<T, 'http' | 'signal'>;

export interface FindListsParams extends ApiParams {
  cursor?: string | undefined;
  pageSize: number | undefined;
  pageIndex: number | undefined;
}

export interface ImportListParams extends ApiParams {
  file: File;
  listId: string | undefined;
  type: Type | undefined;
}

export interface DeleteListParams extends ApiParams {
  deleteReferences?: boolean;
  id: string;
  ignoreReferences?: boolean;
}

export interface ExportListParams extends ApiParams {
  listId: string;
}
