/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import {
  getPrebuiltRuleMock,
  getPrebuiltRuleWithExceptionsMock,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { ELASTIC_SECURITY_RULE_ID } from '@kbn/security-solution-plugin/common';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

/**
 * A helper function to create a rule asset saved object
 *
 * @param overrideParams Params to override the default mock
 * @returns Created rule asset saved object
 */
export const createRuleAssetSavedObject = (overrideParams: Partial<PrebuiltRuleAsset>) => ({
  'security-rule': getPrebuiltRuleMock(overrideParams),
  type: 'security-rule',
  references: [],
  coreMigrationVersion: '8.6.0',
  updated_at: '2022-11-01T12:56:39.717Z',
  created_at: '2022-11-01T12:56:39.717Z',
});

export const SAMPLE_PREBUILT_RULES = [
  createRuleAssetSavedObject({
    ...getPrebuiltRuleWithExceptionsMock(),
    rule_id: ELASTIC_SECURITY_RULE_ID,
    tags: ['test-tag-1'],
    enabled: true,
  }),
  createRuleAssetSavedObject({
    rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
    tags: ['test-tag-2'],
  }),
  createRuleAssetSavedObject({
    rule_id: '00140285-b827-4aee-aa09-8113f58a08f3',
    tags: ['test-tag-3'],
  }),
];

export const SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS = [
  createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
  createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
  createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
  createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
  createRuleAssetSavedObject({ rule_id: 'rule-2', version: 3 }),
];

/**
 * Creates saved objects with prebuilt rule assets which can be used for
 * installing actual prebuilt rules after that. It creates saved objects with
 * only latest versions of the rules. Tha matches the behavior of a rules
 * package without historical versions.
 *
 * NOTE: Version is not added to the rule asset saved object id.
 *
 * @param es Elasticsearch client
 */
export const createPrebuiltRuleAssetSavedObjects = async (
  es: Client,
  rules = SAMPLE_PREBUILT_RULES
): Promise<void> => {
  await es.bulk({
    refresh: true,
    body: rules.flatMap((doc) => [
      {
        index: {
          _index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
          _id: `security-rule:${doc['security-rule'].rule_id}`,
        },
      },
      doc,
    ]),
  });
};

/**
 * Creates saved objects with prebuilt rule assets which can be used for
 * installing actual prebuilt rules after that. It creates saved objects with
 * historical versions of the rules.
 *
 * NOTE: Version is added to the rule asset saved object id.
 *
 * @param es Elasticsearch client
 */
export const createHistoricalPrebuiltRuleAssetSavedObjects = async (
  es: Client,
  rules = SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS
): Promise<void> => {
  await es.bulk({
    refresh: true,
    body: rules.flatMap((doc) => [
      {
        index: {
          _index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
          _id: `security-rule:${doc['security-rule'].rule_id}_${doc['security-rule'].version}`,
        },
      },
      doc,
    ]),
  });
};
