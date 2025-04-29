/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListType,
  NamespaceType,
  UpdateExceptionListItemSchema,
  UpdateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Pagination } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { Rule } from '@kbn/securitysolution-exception-list-components';

export interface FetchItems {
  http: HttpSetup | undefined;
  listIds: string[];
  namespaceTypes: NamespaceType[];
  pagination: Pagination | undefined;
  search?: string;
  filter?: string;
}

export interface FetchListById {
  http: HttpSetup | undefined;
  id: string;
}
export interface DeleteExceptionItem {
  id: string;
  namespaceType: NamespaceType;
  http: HttpSetup | undefined;
}
export interface EditExceptionItem {
  http: HttpSetup | undefined;
  exception: UpdateExceptionListItemSchema;
}

export interface AddExceptionItem {
  http: HttpSetup | undefined;
  exception: CreateExceptionListItemSchema;
}

export interface UpdateExceptionList {
  http: HttpSetup | undefined;
  list: UpdateExceptionListSchema;
}

export interface ExportExceptionList {
  id: string;
  http: HttpSetup | undefined;
  listId: string;
  namespaceType: NamespaceType;
}

export interface DeleteExceptionList {
  id: string;
  http: HttpSetup | undefined;
  namespaceType: NamespaceType;
}

export interface LinkListToRules {
  rules: Rule[];
  listId: string;
  id: string;
  listType: ExceptionListType;
  listNamespaceType: NamespaceType;
}

export interface UnlinkListFromRules {
  rules: Rule[];
  listId: string;
}
