/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod/v4';
import {
  RuleSignatureId,
  RuleVersion,
} from '../../../../../../common/api/detection_engine/model/rule_schema';

/**
 * Minimal schema for deprecated prebuilt rule assets. These are installed by Fleet
 * as "security-rule" SOs with `deprecated: true` and only contain identification fields.
 * They are excluded from all install/upgrade flows and fetched separately.
 */
export type DeprecatedPrebuiltRuleAsset = z.infer<typeof DeprecatedPrebuiltRuleAsset>;
export const DeprecatedPrebuiltRuleAsset = z.object({
  rule_id: RuleSignatureId,
  version: RuleVersion,
  deprecated: z.literal(true),
  name: z.string(),
  deprecated_reason: z.string().optional(),
});
