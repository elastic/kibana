/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListSchema,
  ExceptionListType,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

export const TRUSTED_APPS_LIST_TYPE: ExceptionListType =
  ExceptionListTypeEnum.ENDPOINT_TRUSTED_APPS;

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  'item_id',
  `entries.value`,
  `entries.entries.value`,
];

export const TRUSTED_APPS_EXCEPTION_LIST_DEFINITION: CreateExceptionListSchema = {
  name: ENDPOINT_ARTIFACT_LISTS.trustedApps.name,
  namespace_type: 'agnostic',
  description: ENDPOINT_ARTIFACT_LISTS.trustedApps.description,
  list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
  type: ExceptionListTypeEnum.ENDPOINT_TRUSTED_APPS,
};
