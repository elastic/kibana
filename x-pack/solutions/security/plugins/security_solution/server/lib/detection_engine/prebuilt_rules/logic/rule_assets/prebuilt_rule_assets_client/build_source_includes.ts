/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod/v4';
import {
  PrebuiltAssetBaseProps,
  PrebuiltRuleAssetIdentityFields,
} from '../../../model/rule_assets/prebuilt_rule_asset';
import { TypeSpecificCreatePropsInternal } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../prebuilt_rule_assets_type';

const requiredKeysOf = (shape: z.ZodRawShape): string[] =>
  Object.entries(shape)
    .filter(([, def]) => def._zod.optin !== 'optional')
    .map(([key]) => key);

/**
 * Top-level `security-rule` attribute keys that must be fetched from ES no
 * matter what `fields` the caller asks for, otherwise the rule will fail
 * `validatePrebuiltRuleAssets` or `convertPrebuiltRuleAssetToRuleResponse`.
 *
 * Derived from the Zod schemas so it stays in sync automatically when required
 * fields are added or removed.
 */
export const PREBUILT_RULE_ASSET_BASELINE_FIELDS: ReadonlySet<string> = new Set([
  ...requiredKeysOf(PrebuiltAssetBaseProps.shape),
  ...TypeSpecificCreatePropsInternal.options.flatMap((v) =>
    requiredKeysOf(v.shape as z.ZodRawShape)
  ),
  ...requiredKeysOf(PrebuiltRuleAssetIdentityFields.shape),
]);

export const buildPrebuiltRuleAssetSourceIncludes = (
  requestedFields?: string[]
): string[] | undefined => {
  if (!requestedFields?.length) {
    return undefined;
  }

  const merged = new Set<string>([...requestedFields, ...PREBUILT_RULE_ASSET_BASELINE_FIELDS]);
  const attributePaths = Array.from(merged).map(
    (field) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.${field}`
  );

  return [...attributePaths];
};
