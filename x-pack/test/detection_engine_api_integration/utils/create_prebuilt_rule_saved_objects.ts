/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import {
  getPrebuiltRuleMock,
  getPrebuiltRuleWithExceptionsMock,
} from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules/model/prebuilt_rule.mock';

/**
 * Rule signature id (`rule.rule_id`) of the prebuilt "Endpoint Security" rule.
 */
export const ELASTIC_SECURITY_RULE_ID = '9a1a2dae-0b5f-4c3d-8305-a268d404c306';

export const SAMPLE_PREBUILT_RULES = [
  {
    'security-rule': {
      ...getPrebuiltRuleWithExceptionsMock(),
      rule_id: ELASTIC_SECURITY_RULE_ID,
      tags: ['test-tag-1'],
      enabled: true,
    },
    type: 'security-rule',
    references: [],
    coreMigrationVersion: '8.6.0',
    updated_at: '2022-11-01T12:56:39.717Z',
    created_at: '2022-11-01T12:56:39.717Z',
  },
  {
    'security-rule': {
      ...getPrebuiltRuleMock(),
      rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
      tags: ['test-tag-2'],
    },
    type: 'security-rule',
    references: [],
    coreMigrationVersion: '8.6.0',
    updated_at: '2022-11-01T12:56:39.717Z',
    created_at: '2022-11-01T12:56:39.717Z',
  },
  {
    'security-rule': {
      ...getPrebuiltRuleMock(),
      rule_id: '00140285-b827-4aee-aa09-8113f58a08f3',
      tags: ['test-tag-3'],
    },
    type: 'security-rule',
    references: [],
    coreMigrationVersion: '8.6.0',
    updated_at: '2022-11-01T12:56:39.717Z',
    created_at: '2022-11-01T12:56:39.717Z',
  },
];

/**
 * Creates saved objects with prebuilt rule assets which can be used for installing actual prebuilt rules after that.
 *
 * @param es Elasticsearch client
 */
export const createPrebuiltRuleAssetSavedObjects = async (es: Client): Promise<void> => {
  await es.bulk({
    refresh: 'wait_for',
    body: SAMPLE_PREBUILT_RULES.flatMap((doc) => [
      { index: { _index: '.kibana', _id: `security-rule:${doc['security-rule'].rule_id}` } },
      doc,
    ]),
  });
};
