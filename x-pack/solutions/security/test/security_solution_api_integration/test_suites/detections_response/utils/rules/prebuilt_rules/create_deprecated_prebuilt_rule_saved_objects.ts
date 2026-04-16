/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

interface DeprecatedRuleAssetParams {
  rule_id: string;
  version: number;
  name?: string;
  deprecated_reason?: string;
}

const ruleAssetSavedObjectESFields = {
  type: 'security-rule',
  references: [],
  coreMigrationVersion: '8.6.0',
  updated_at: '2022-11-01T12:56:39.717Z',
  created_at: '2022-11-01T12:56:39.717Z',
};

/**
 * Creates a minimal deprecated rule asset saved object.
 * Deprecated rule assets have only the fields required by model version 3:
 * rule_id, version, name, deprecated, and optionally deprecated_reason.
 */
export const createDeprecatedRuleAssetSavedObject = (params: DeprecatedRuleAssetParams) => ({
  'security-rule': {
    rule_id: params.rule_id,
    version: params.version,
    name: params.name ?? `Deprecated Rule ${params.rule_id}`,
    deprecated: true,
    ...(params.deprecated_reason !== undefined && {
      deprecated_reason: params.deprecated_reason,
    }),
  },
  ...ruleAssetSavedObjectESFields,
});

/**
 * Bulk-creates deprecated rule asset saved objects in Elasticsearch.
 * These represent rules that have been deprecated in the detection rules package.
 *
 * @param es Elasticsearch client
 * @param rules Array of deprecated rule parameters
 */
export const createDeprecatedPrebuiltRuleAssetSavedObjects = async (
  es: Client,
  rules: DeprecatedRuleAssetParams[]
): Promise<void> => {
  if (rules.length === 0) {
    return;
  }

  const soObjects = rules.map(createDeprecatedRuleAssetSavedObject);

  const response = await es.bulk({
    refresh: true,
    operations: soObjects.flatMap((doc) => [
      {
        index: {
          _index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
          _id: `security-rule:${doc['security-rule'].rule_id}_${doc['security-rule'].version}`,
        },
      },
      doc,
    ]),
  });

  if (response.errors) {
    throw new Error(
      `Unable to bulk create deprecated rule assets. Response items: ${JSON.stringify(
        response.items
      )}`
    );
  }
};
