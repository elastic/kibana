/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { ALERT_RULE_EXECUTION_UUID } from '@kbn/rule-data-utils';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
} from '../../../../schedules/fields/field_names';
import { AttackDiscoveryAlertDocument } from '../../../../schedules/types';

/** Returns `true` if the document is missing fields required to create an `AttackDiscoveryAlert` */
export const isMissingRequiredFields = (
  hit: estypes.SearchHit<AttackDiscoveryAlertDocument>
): boolean =>
  hit._source == null ||
  hit._source['@timestamp'] == null ||
  !Array.isArray(hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS]) ||
  hit._source[ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT] == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG] == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG].action_type_id == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG].connector_id == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG].name == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] == null ||
  hit._source[ALERT_RULE_EXECUTION_UUID] == null ||
  hit._id == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_TITLE] == null;
