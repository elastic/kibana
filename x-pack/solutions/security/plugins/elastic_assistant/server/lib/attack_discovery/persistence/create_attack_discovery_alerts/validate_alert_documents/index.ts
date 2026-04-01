/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_EXECUTION_UUID, ALERT_UUID } from '@kbn/rule-data-utils';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  type AttackDiscoveryAlertDocument,
} from '@kbn/attack-discovery-schedules-common';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  documentId?: string;
}

/**
 * Validates that an attack discovery alert document has all required fields before writing to Elasticsearch.
 * This prevents documents from being written that would later be filtered out during retrieval.
 *
 * Note: ALERT_UUID and ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT are NOT validated here because:
 * - ALERT_UUID is generated during transformation and used as _id by Elasticsearch
 * - ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT is not present in workflow-generated discoveries
 */
export const validateAlertDocument = (document: AttackDiscoveryAlertDocument): ValidationResult => {
  const missingFields: string[] = [];
  const documentId = document[ALERT_UUID] ?? 'unknown';

  // Check @timestamp
  if (document['@timestamp'] == null) {
    missingFields.push('@timestamp');
  }

  // Check ALERT_ATTACK_DISCOVERY_ALERT_IDS (must be an array)
  if (!Array.isArray(document[ALERT_ATTACK_DISCOVERY_ALERT_IDS])) {
    missingFields.push(`${ALERT_ATTACK_DISCOVERY_ALERT_IDS} (not an array)`);
  }

  // Check ALERT_ATTACK_DISCOVERY_API_CONFIG and its nested fields
  if (document[ALERT_ATTACK_DISCOVERY_API_CONFIG] == null) {
    missingFields.push(ALERT_ATTACK_DISCOVERY_API_CONFIG);
  } else {
    const apiConfig = document[ALERT_ATTACK_DISCOVERY_API_CONFIG];
    if (apiConfig.action_type_id == null) {
      missingFields.push(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id`);
    }
    if (apiConfig.connector_id == null) {
      missingFields.push(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id`);
    }
    if (apiConfig.name == null) {
      missingFields.push(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.name`);
    }
  }

  // Check ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN
  if (document[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] == null) {
    missingFields.push(ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN);
  }

  // Check ALERT_RULE_EXECUTION_UUID (generation UUID)
  if (document[ALERT_RULE_EXECUTION_UUID] == null) {
    missingFields.push(ALERT_RULE_EXECUTION_UUID);
  }

  // Check ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN
  if (document[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] == null) {
    missingFields.push(ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN);
  }

  // Check ALERT_ATTACK_DISCOVERY_TITLE
  if (document[ALERT_ATTACK_DISCOVERY_TITLE] == null) {
    missingFields.push(ALERT_ATTACK_DISCOVERY_TITLE);
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    documentId,
  };
};

export interface BatchValidationResult {
  isValid: boolean;
  errors: Array<{ documentId: string; missingFields: string[] }>;
}

const getMissingFieldsForDocument = (
  doc: AttackDiscoveryAlertDocument,
  index: number
): { documentId: string; missingFields: string[] } | null => {
  const missingFields: string[] = [
    doc['@timestamp'] == null ? '@timestamp' : null,
    !Array.isArray(doc[ALERT_ATTACK_DISCOVERY_ALERT_IDS])
      ? `${ALERT_ATTACK_DISCOVERY_ALERT_IDS} (not an array)`
      : null,
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG] == null ? ALERT_ATTACK_DISCOVERY_API_CONFIG : null,
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG] != null &&
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG].action_type_id == null
      ? `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id`
      : null,
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG] != null &&
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG].connector_id == null
      ? `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id`
      : null,
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG] != null &&
    doc[ALERT_ATTACK_DISCOVERY_API_CONFIG].name == null
      ? `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.name`
      : null,
    doc[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] == null
      ? ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN
      : null,
    doc[ALERT_RULE_EXECUTION_UUID] == null ? ALERT_RULE_EXECUTION_UUID : null,
    doc[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] == null
      ? ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN
      : null,
    doc[ALERT_ATTACK_DISCOVERY_TITLE] == null ? ALERT_ATTACK_DISCOVERY_TITLE : null,
  ].filter((field): field is string => field !== null);

  if (missingFields.length === 0) {
    return null;
  }

  const documentId = doc[ALERT_RULE_EXECUTION_UUID] ?? `document-${index}`;
  return { documentId, missingFields };
};

/**
 * Validates an array of AttackDiscoveryAlertDocument objects to ensure all required fields are present.
 * This validation runs *before* documents are written to Elasticsearch.
 *
 * NOTE: `_id` is generated by Elasticsearch upon insertion, so it's not validated here.
 * NOTE: `kibana.alert.uuid` is also generated by Elasticsearch and used as the document `_id`,
 * so it's not validated here as it's not present in workflow-generated discoveries.
 * NOTE: `kibana.alert.attack_discovery.alerts_context_count` is an informational field and not strictly
 * required for the core functionality of displaying attack discoveries, so it's not validated here.
 */
export const validateAlertDocuments = (
  alertDocuments: AttackDiscoveryAlertDocument[]
): BatchValidationResult => {
  const errors = alertDocuments
    .map((doc, index) => getMissingFieldsForDocument(doc, index))
    .filter((error): error is { documentId: string; missingFields: string[] } => error !== null);

  return { isValid: errors.length === 0, errors };
};
