/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

// Field name constants
const ALERT_ATTACK_DISCOVERY_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids';
const ALERT_ATTACK_DISCOVERY_API_CONFIG = 'kibana.alert.attack_discovery.api_config';
const ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN = 'kibana.alert.attack_discovery.details_markdown';
const ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN = 'kibana.alert.attack_discovery.summary_markdown';
const ALERT_ATTACK_DISCOVERY_TITLE = 'kibana.alert.attack_discovery.title';

type AttackDiscoveryAlertDocument = Record<string, unknown>;

/**
 * Check if required fields are present in the document
 */
export const isMissingRequiredFields = (
  hit: estypes.SearchHit<AttackDiscoveryAlertDocument>
): boolean => {
  if (!hit._source) return true;

  const source = hit._source;
  return (
    !source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] ||
    !source[ALERT_ATTACK_DISCOVERY_API_CONFIG] ||
    !source[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] ||
    !source[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] ||
    !source[ALERT_ATTACK_DISCOVERY_TITLE]
  );
};
