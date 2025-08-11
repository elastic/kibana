/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  'item_id',
  `entries.value`,
  `entries.entries.value`,
];

export const TRUSTED_DEVICES_EXCEPTION_LIST_DEFINITION: CreateExceptionListSchema = {
  description: ENDPOINT_ARTIFACT_LISTS.trustedDevices.description,
  list_id: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
  name: ENDPOINT_ARTIFACT_LISTS.trustedDevices.name,
  namespace_type: 'agnostic',
  type: ExceptionListTypeEnum.ENDPOINT_TRUSTED_DEVICES,
};
