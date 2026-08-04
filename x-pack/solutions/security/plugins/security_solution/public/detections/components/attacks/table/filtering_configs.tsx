/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '@kbn/es-query';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';
import { TYPE_FILTER_MANUALLY_GENERATED } from '../filters/type_filter';

export const buildConnectorIdFilter = (connectorNames: string[]): Filter[] => {
  if (!connectorNames.length) return [];

  return [
    {
      meta: {
        key: 'kibana.alert.attack_discovery.api_config.name',
        type: 'term',
        index: '.alerts-security.attack.discovery.alerts',
        disabled: false,
      },
      query: {
        terms: {
          'kibana.alert.attack_discovery.api_config.name': connectorNames,
        },
      },
    },
  ];
};

export const buildAttacksOnlyFilter = (): Filter[] => {
  return [
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
  ];
};

export const buildAttackTypeFilter = (selectedTypes: string[]): Filter[] => {
  if (selectedTypes.length === 0 || selectedTypes.length === 2) {
    return [];
  }

  const isManuallyGenerated = selectedTypes.includes(TYPE_FILTER_MANUALLY_GENERATED);
  const ruleTypeId = isManuallyGenerated
    ? ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID
    : ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID;

  return [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        key: ALERT_RULE_TYPE_ID,
        type: 'phrase',
        params: {
          query: ruleTypeId,
        },
      },
      query: {
        match_phrase: {
          [ALERT_RULE_TYPE_ID]: ruleTypeId,
        },
      },
    },
  ];
};
