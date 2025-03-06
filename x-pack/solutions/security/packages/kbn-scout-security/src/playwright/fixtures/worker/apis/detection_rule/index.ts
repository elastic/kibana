/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/scout';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
} from '@kbn/security-solution-plugin/common/constants';
import { CUSTOM_QUERY_RULE } from '../../../test_data';

export interface DetectionRuleFixture {
  createCustomQueryRule: () => Promise<void>;
  deleteAll: () => Promise<void>;
}

export const createDetectionRuleFixture = async ({ kbnClient }: { kbnClient: KbnClient }) => {
  const detectionRuleHelper: DetectionRuleFixture = {
    createCustomQueryRule: async (body = CUSTOM_QUERY_RULE) => {
      await kbnClient.request({
        method: 'POST',
        path: DETECTION_ENGINE_RULES_URL,
        body,
      });
    },

    deleteAll: async () => {
      await kbnClient.request({
        method: 'POST',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          query: '',
          action: 'delete',
        },
      });
    },
  };

  return detectionRuleHelper;
};
