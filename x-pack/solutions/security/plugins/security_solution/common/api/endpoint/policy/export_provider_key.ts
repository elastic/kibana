/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  EXPORT_PROVIDER_ACCOUNT_KEY_MAX_LENGTH,
  EXPORT_PROVIDER_ID_MAX_LENGTH,
} from '../../../endpoint/service/response_actions/export_providers';
import type { PolicyData } from '../../../endpoint/types';

/** Package policy ids and saved object versions are short; the bound only stops oversized input. */
const PACKAGE_POLICY_ID_MAX_LENGTH = 1024;
const PACKAGE_POLICY_VERSION_MAX_LENGTH = 1024;

/** Request schema of `PUT EXPORT_PROVIDER_KEY_ROUTE` */
export const SetExportProviderKeyRequestSchema = {
  params: schema.object({
    package_policy_id: schema.string({ minLength: 1, maxLength: PACKAGE_POLICY_ID_MAX_LENGTH }),
    provider_id: schema.string({ minLength: 1, maxLength: EXPORT_PROVIDER_ID_MAX_LENGTH }),
  }),
  body: schema.object({
    type: schema.literal('account_key'),
    // The format is checked by the handler, so the error never repeats the value
    account_key: schema.string({ maxLength: EXPORT_PROVIDER_ACCOUNT_KEY_MAX_LENGTH }),
    /** The package policy `version` the caller last saw */
    package_policy_version: schema.string({
      minLength: 1,
      maxLength: PACKAGE_POLICY_VERSION_MAX_LENGTH,
    }),
  }),
};

export type SetExportProviderKeyRequestParams = TypeOf<
  typeof SetExportProviderKeyRequestSchema.params
>;

export type SetExportProviderKeyRequestBody = TypeOf<typeof SetExportProviderKeyRequestSchema.body>;

export interface SetExportProviderKeyResponse {
  /** The updated package policy; it holds only the key reference */
  item: PolicyData;
}
