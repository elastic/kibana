/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import {
  buildAttacksOnlyFilter,
  buildConnectorIdFilter,
  buildAttackTypeFilter,
} from './filtering_configs';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';
import { TYPE_FILTER_SCHEDULED, TYPE_FILTER_MANUALLY_GENERATED } from '../filters/type_filter';

describe('filtering configs', () => {
  describe('buildConnectorIdFilter', () => {
    it('should return [] if called with []', () => {
      const result = buildConnectorIdFilter([]);
      expect(result).toEqual([]);
    });

    it('should match snapshot', () => {
      const result = buildConnectorIdFilter(['my-connector']);

      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "meta": Object {
              "disabled": false,
              "index": ".alerts-security.attack.discovery.alerts",
              "key": "kibana.alert.attack_discovery.api_config.name",
              "type": "term",
            },
            "query": Object {
              "terms": Object {
                "kibana.alert.attack_discovery.api_config.name": Array [
                  "my-connector",
                ],
              },
            },
          },
        ]
      `);
    });
  });

  describe('buildAttacksOnlyFilter', () => {
    it('should return exists filter', () => {
      const result = buildAttacksOnlyFilter();
      expect(result).toEqual([
        {
          query: {
            exists: {
              field: ALERT_ATTACK_IDS,
            },
          },
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            key: ALERT_ATTACK_IDS,
            type: 'exists',
            value: 'exists',
          },
        },
      ]);
    });
  });

  describe('buildAttackTypeFilter', () => {
    it('should return [] if called with []', () => {
      const result = buildAttackTypeFilter([]);
      expect(result).toEqual([]);
    });

    it('should return [] if called with both types', () => {
      const result = buildAttackTypeFilter([TYPE_FILTER_SCHEDULED, TYPE_FILTER_MANUALLY_GENERATED]);
      expect(result).toEqual([]);
    });

    it('should return filter for manually generated attacks', () => {
      const result = buildAttackTypeFilter([TYPE_FILTER_MANUALLY_GENERATED]);
      expect(result).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            key: ALERT_RULE_TYPE_ID,
            type: 'phrase',
            params: {
              query: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
            },
          },
          query: {
            match_phrase: {
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
            },
          },
        },
      ]);
    });

    it('should return filter for scheduled attacks', () => {
      const result = buildAttackTypeFilter([TYPE_FILTER_SCHEDULED]);
      expect(result).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            key: ALERT_RULE_TYPE_ID,
            type: 'phrase',
            params: {
              query: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            },
          },
          query: {
            match_phrase: {
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            },
          },
        },
      ]);
    });
  });
});
