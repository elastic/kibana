/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { dsl } from './dsl';

describe('dsl', () => {
  describe('isAttack', () => {
    it('returns a terms query matching attack discovery rule type IDs', () => {
      const result = dsl.isAttack();

      expect(result).toEqual({
        terms: {
          'kibana.alert.rule.rule_type_id': [
            ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
          ],
        },
      });
    });
  });

  describe('isNotAttack', () => {
    it('returns a must_not query negating isAttack', () => {
      const result = dsl.isNotAttack();

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'kibana.alert.rule.rule_type_id': [
                ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
                ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
              ],
            },
          },
        },
      });
    });
  });
});
