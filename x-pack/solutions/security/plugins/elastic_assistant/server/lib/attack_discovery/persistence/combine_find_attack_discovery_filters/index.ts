/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
} from '../../schedules/fields';

const escapeQueryString = (str: string) => str.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string

// returns a KQL filter by combining the provided filters with `AND`
export const combineFindAttackDiscoveryFilters = ({
  alertIds,
  connectorNames,
  end,
  executionUuid,
  ids,
  search,
  start,
  status,
}: {
  alertIds?: string[];
  connectorNames?: string[];
  end?: string;
  executionUuid?: string;
  ids?: string[];
  search?: string;
  start?: string;
  status?: string[];
}): string => {
  const MARKDOWN_FIELDS_WITH_REPLACEMENTS = [
    ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
    ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
    ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
    ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ];

  const filters: string[] = [
    ...(search != null && search.trim().length > 0
      ? [
          `(${MARKDOWN_FIELDS_WITH_REPLACEMENTS.map(
            (field) => `${field}: "*${escapeQueryString(search.trim())}*"`
          ).join(' OR ')})`,
        ]
      : []),
    ...(ids && ids.length > 0 ? [`(${ids.map((id) => `_id: "${id}"`).join(' OR ')})`] : []),
    ...(status && status.length > 0
      ? [`(${status.map((s) => `${ALERT_WORKFLOW_STATUS}: "${s}"`).join(' OR ')})`]
      : []),
    ...(connectorNames && connectorNames.length > 0
      ? [
          `(${connectorNames
            .map((name) => `${ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME}: "${name}"`)
            .join(' OR ')})`,
        ]
      : []),

    ...(alertIds && alertIds.length > 0
      ? [`(${alertIds.map((id) => `${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "${id}"`).join(' OR ')})`]
      : []),
    ...(executionUuid ? [`kibana.alert.rule.execution.uuid: "${executionUuid}"`] : []),
    ...(start ? [`@timestamp >= "${start}"`] : []),
    ...(end ? [`@timestamp <= "${end}"`] : []),
  ];

  return filters.join(' AND ');
};
