/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import { getMarkdownFields, transformInternalReplacements } from '@kbn/elastic-assistant-common';
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
import { pipe } from 'lodash/fp';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_RISK_SCORE,
} from '../../../../schedules/fields/field_names';
import type { AttackDiscoveryAlertDocument } from '../../../../schedules/types';

export const transformAttackDiscoveryAlertDocumentToApi = ({
  attackDiscoveryAlertDocument,
  enableFieldRendering,
  id,
  withReplacements,
}: {
  attackDiscoveryAlertDocument: AttackDiscoveryAlertDocument;
  enableFieldRendering: boolean;
  id: string;
  withReplacements: boolean;
}): AttackDiscoveryApiAlert => {
  const doc = attackDiscoveryAlertDocument as Record<string, unknown>;

  const renderMarkdownField = (field: string | undefined): string | undefined => {
    if (field == null) {
      return field;
    }

    if (!enableFieldRendering) {
      return getMarkdownFields(field); // transforms, for example `{{ user.name james }}` to `james`
    }

    return field;
  };

  const getFieldWithReplacement = <T extends string | undefined>({
    replacementField,
    normalField,
    defaultValue,
  }: {
    replacementField: string;
    normalField: string;
    defaultValue: T;
  }): T => {
    if (withReplacements && typeof doc[replacementField] === 'string') {
      return doc[replacementField] as T;
    } else if (typeof doc[normalField] === 'string') {
      return doc[normalField] as T;
    }
    return defaultValue;
  };

  const getFieldWithReplacementThenRender = <T extends string | undefined>(params: {
    replacementField: string;
    normalField: string;
    defaultValue: T;
  }): T =>
    pipe(
      () => getFieldWithReplacement<T>(params),
      (val: T) => renderMarkdownField(val) as T
    )();

  return {
    alert_ids: attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_ALERT_IDS] ?? [], // required field
    alert_rule_uuid: attackDiscoveryAlertDocument[ALERT_RULE_UUID],
    alert_start: moment(attackDiscoveryAlertDocument[ALERT_START]).isValid()
      ? moment(attackDiscoveryAlertDocument[ALERT_START]).toISOString()
      : undefined, // optional field
    alert_updated_at: moment(attackDiscoveryAlertDocument[ALERT_UPDATED_AT]).isValid()
      ? moment(attackDiscoveryAlertDocument[ALERT_UPDATED_AT]).toISOString()
      : undefined, // optional field
    alert_updated_by_user_id: attackDiscoveryAlertDocument[ALERT_UPDATED_BY_USER_ID],
    alert_updated_by_user_name: attackDiscoveryAlertDocument[ALERT_UPDATED_BY_USER_NAME],
    alert_workflow_status: attackDiscoveryAlertDocument[ALERT_WORKFLOW_STATUS],
    alert_workflow_status_updated_at: moment(
      attackDiscoveryAlertDocument[ALERT_WORKFLOW_STATUS_UPDATED_AT]
    ).isValid()
      ? moment(attackDiscoveryAlertDocument[ALERT_WORKFLOW_STATUS_UPDATED_AT]).toISOString()
      : undefined, // optional field
    connector_id: attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_API_CONFIG].connector_id, // required field
    connector_name: attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_API_CONFIG].name,
    details_markdown: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
      defaultValue: '',
    }), // required field
    entity_summary_markdown: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
      defaultValue: undefined,
    }),
    generation_uuid: attackDiscoveryAlertDocument[ALERT_RULE_EXECUTION_UUID] ?? '', // required field
    id, // required field
    mitre_attack_tactics: Array.isArray(
      attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]
    )
      ? attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]
      : undefined,
    replacements: Array.isArray(attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_REPLACEMENTS])
      ? transformInternalReplacements(
          attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_REPLACEMENTS]
        )
      : undefined,
    risk_score: attackDiscoveryAlertDocument[ALERT_RISK_SCORE],
    summary_markdown: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
      defaultValue: '',
    }), // required field
    timestamp: moment(attackDiscoveryAlertDocument['@timestamp']).isValid()
      ? moment(attackDiscoveryAlertDocument['@timestamp']).toISOString()
      : new Date().toISOString(), // required field
    title: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_TITLE,
      defaultValue: '',
    }), // required field
    user_id: attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_USER_ID],
    user_name: attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_USER_NAME],
    users: Array.isArray(attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_USERS])
      ? attackDiscoveryAlertDocument[ALERT_ATTACK_DISCOVERY_USERS]
      : undefined,
  };
};
