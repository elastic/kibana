/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';

// this pages follows versioning interface strategy https://docs.elastic.dev/kibana-dev-docs/versioning-interfaces

// Kubernetes namespace names follow RFC 1123 label rules: max 63 characters.
const NAMESPACE_MAX_LENGTH = 63;

export const getComplianceDashboardSchema = schema.object({
  policy_template: schema.oneOf([
    schema.literal(CSPM_POLICY_TEMPLATE),
    schema.literal(KSPM_POLICY_TEMPLATE),
  ]),
});

export const getComplianceDashboardQuerySchema = schema.object({
  namespace: schema.maybe(schema.string({ maxLength: NAMESPACE_MAX_LENGTH })),
});
