/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { AttackDiscoveryAlert, transformInternalReplacements } from '@kbn/elastic-assistant-common';
import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_UPDATED_AT,
  ALERT_UPDATED_BY_USER_ID,
  ALERT_UPDATED_BY_USER_NAME,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
} from '@kbn/rule-data-utils';
import moment from 'moment';

import { isMissingRequiredFields } from './is_missing_required_fields';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_RISK_SCORE,
} from '../../../schedules/fields/field_names';
import { AttackDiscoveryAlertDocument } from '../../../schedules/types';

interface HasNumericValue {
  value: number;
}

interface ConnectorNamesAggregation {
  buckets?: Array<{
    key?: string;
    doc_count?: number;
  }>;
}

const aggregationHasValue = (aggregation: unknown): aggregation is HasNumericValue =>
  typeof aggregation === 'object' &&
  aggregation !== null &&
  'value' in aggregation &&
  typeof aggregation.value === 'number';

interface TransformSearchResponseToAlerts {
  connectorNames: string[];
  data: AttackDiscoveryAlert[];
  uniqueAlertIdsCount: number;
}

export const transformSearchResponseToAlerts = ({
  logger,
  response,
}: {
  logger: Logger;
  response: estypes.SearchResponse<AttackDiscoveryAlertDocument>;
}): TransformSearchResponseToAlerts => {
  const data = response.hits.hits.flatMap((hit) => {
    if (hit._source == null || isMissingRequiredFields(hit)) {
      logger.warn(
        () =>
          `Skipping Attack discovery alert document with id ${hit._id} in transformSearchResponseToAlerts because it's missing required fields.`
      );

      return []; // skip this hit
    }

    const source = hit._source;

    // NOTE: we won't return this hit if `isMissingRequiredFields` above returns  `false`
    return {
      alertIds: source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] ?? [], // required field
      alertRuleUuid: source[ALERT_RULE_UUID],
      alertStart: moment(source[ALERT_START]).isValid()
        ? moment(source[ALERT_START]).toISOString()
        : undefined, // optional field
      alertUpdatedAt: moment(source[ALERT_UPDATED_AT]).isValid()
        ? moment(source[ALERT_UPDATED_AT]).toISOString()
        : undefined, // optional field
      alertUpdatedByUserId: source[ALERT_UPDATED_BY_USER_ID],
      alertUpdatedByUserName: source[ALERT_UPDATED_BY_USER_NAME],
      alertWorkflowStatus: source[ALERT_WORKFLOW_STATUS],
      alertWorkflowStatusUpdatedAt: moment(source[ALERT_WORKFLOW_STATUS_UPDATED_AT]).isValid()
        ? moment(source[ALERT_WORKFLOW_STATUS_UPDATED_AT]).toISOString()
        : undefined, // optional field
      connectorId: source[ALERT_ATTACK_DISCOVERY_API_CONFIG].connector_id, // required field
      connectorName: source[ALERT_ATTACK_DISCOVERY_API_CONFIG].name,
      detailsMarkdown: source[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] ?? '', // required field
      entitySummaryMarkdown: source[ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN],
      generationUuid: source[ALERT_RULE_EXECUTION_UUID] ?? '', // required field
      id: hit._id ?? source[ALERT_RULE_EXECUTION_UUID] ?? '', // required field
      mitreAttackTactics: Array.isArray(source[ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS])
        ? source[ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]
        : undefined,
      replacements: Array.isArray(source[ALERT_ATTACK_DISCOVERY_REPLACEMENTS])
        ? transformInternalReplacements(source[ALERT_ATTACK_DISCOVERY_REPLACEMENTS])
        : undefined,
      riskScore: source[ALERT_RISK_SCORE],
      summaryMarkdown: source[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] ?? '', // required field
      timestamp: moment(source['@timestamp']).isValid()
        ? moment(source['@timestamp']).toISOString()
        : new Date().toISOString(), // required field
      title: source[ALERT_ATTACK_DISCOVERY_TITLE] ?? '', // required field
      userId: source[ALERT_ATTACK_DISCOVERY_USER_ID],
      userName: source[ALERT_ATTACK_DISCOVERY_USER_NAME],
      users: Array.isArray(source[ALERT_ATTACK_DISCOVERY_USERS])
        ? source[ALERT_ATTACK_DISCOVERY_USERS]
        : undefined,
    };
  });

  const uniqueAlertIdsCountAggregation = response.aggregations?.unique_alert_ids_count;

  const uniqueAlertIdsCount = aggregationHasValue(uniqueAlertIdsCountAggregation)
    ? uniqueAlertIdsCountAggregation.value
    : 0;

  const connectorNamesAggregation: ConnectorNamesAggregation | undefined = response.aggregations
    ?.api_config_name as ConnectorNamesAggregation;

  const connectorNames =
    connectorNamesAggregation?.buckets?.flatMap((bucket) => bucket.key ?? []) ?? [];

  return {
    connectorNames: [...connectorNames].sort(), // mutation
    data,
    uniqueAlertIdsCount,
  };
};
