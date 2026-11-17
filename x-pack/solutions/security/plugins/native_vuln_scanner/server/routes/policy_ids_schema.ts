/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_POLICY_ID_LENGTH,
  MAX_POLICY_IDS,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';

export const policyIdsBodySchema = schema.object({
  policyIds: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_POLICY_ID_LENGTH }), {
    minSize: 1,
    maxSize: MAX_POLICY_IDS,
  }),
});
