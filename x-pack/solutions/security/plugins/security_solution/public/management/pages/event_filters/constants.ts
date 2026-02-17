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
import {
  EXCEPTION_LIST_URL,
  EXCEPTION_LIST_ITEM_URL,
  ENDPOINT_ARTIFACT_LISTS,
} from '@kbn/securitysolution-list-constants';

export const EVENT_FILTER_LIST_TYPE: ExceptionListType = ExceptionListTypeEnum.ENDPOINT_EVENTS;
export const EVENT_FILTER_LIST_DEFINITION: CreateExceptionListSchema = {
  name: ENDPOINT_ARTIFACT_LISTS.eventFilters.name,
  namespace_type: 'agnostic',
  description: ENDPOINT_ARTIFACT_LISTS.eventFilters.description,
  list_id: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
  type: EVENT_FILTER_LIST_TYPE,
};

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  `entries.value`,
  `entries.entries.value`,
  `comments.comment`,
  `item_id`,
];

export const ENDPOINT_EVENT_FILTERS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.eventFilters.id;
export { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL };
