/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '@kbn/es-query';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';

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
