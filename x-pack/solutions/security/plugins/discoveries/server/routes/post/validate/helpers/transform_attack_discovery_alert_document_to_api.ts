/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';
import moment from 'moment';
import {
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_UPDATED_AT,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ALERT_RULE_EXECUTION_UUID,
} from '@kbn/rule-data-utils';
import { getMarkdownFields } from './get_markdown_fields';

// Field name constants
const ALERT_ATTACK_DISCOVERY_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids';
const ALERT_ATTACK_DISCOVERY_API_CONFIG = 'kibana.alert.attack_discovery.api_config';
const ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN = 'kibana.alert.attack_discovery.details_markdown';
const ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.details_markdown_with_replacements';
const ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN =
  'kibana.alert.attack_discovery.entity_summary_markdown';
const ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.entity_summary_markdown_with_replacements';
const ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS =
  'kibana.alert.attack_discovery.mitre_attack_tactics';
const ALERT_ATTACK_DISCOVERY_REPLACEMENTS = 'kibana.alert.attack_discovery.replacements';
const ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN = 'kibana.alert.attack_discovery.summary_markdown';
const ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.summary_markdown_with_replacements';
const ALERT_ATTACK_DISCOVERY_TITLE = 'kibana.alert.attack_discovery.title';
const ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.title_with_replacements';
const ALERT_UPDATED_BY_USER_ID = 'kibana.alert.updated_by_user_id';
const ALERT_UPDATED_BY_USER_NAME = 'kibana.alert.updated_by_user_name';

type AttackDiscoveryAlertDocument = Record<string, unknown>;

/**
 * Transform an Elasticsearch attack discovery alert document to API format
 */
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
  const doc = attackDiscoveryAlertDocument;

  const renderMarkdownField = (field: string | undefined): string | undefined => {
    if (field == null) {
      return field;
    }

    if (!enableFieldRendering) {
      return getMarkdownFields(field);
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

  const getFieldWithReplacementThenRender = <T extends string | undefined>({
    replacementField,
    normalField,
    defaultValue,
  }: {
    replacementField: string;
    normalField: string;
    defaultValue: T;
  }): T =>
    renderMarkdownField(
      getFieldWithReplacement<T>({
        replacementField,
        normalField,
        defaultValue,
      })
    ) as T;

  const apiConfig = doc[ALERT_ATTACK_DISCOVERY_API_CONFIG] as Record<string, unknown>;
  const replacements = doc[ALERT_ATTACK_DISCOVERY_REPLACEMENTS] as
    | Array<{
        uuid: string;
        value: string;
      }>
    | undefined;

  return {
    alert_ids: (doc[ALERT_ATTACK_DISCOVERY_ALERT_IDS] as string[]) ?? [],
    alert_rule_uuid: doc[ALERT_RULE_UUID] as string | undefined,
    alert_start: moment(doc[ALERT_START] as string).isValid()
      ? moment(doc[ALERT_START] as string).toISOString()
      : undefined,
    alert_updated_at: moment(doc[ALERT_UPDATED_AT] as string).isValid()
      ? moment(doc[ALERT_UPDATED_AT] as string).toISOString()
      : undefined,
    alert_updated_by_user_id: doc[ALERT_UPDATED_BY_USER_ID] as string | undefined,
    alert_updated_by_user_name: doc[ALERT_UPDATED_BY_USER_NAME] as string | undefined,
    alert_workflow_status: doc[ALERT_WORKFLOW_STATUS] as string | undefined,
    alert_workflow_status_updated_at: moment(
      doc[ALERT_WORKFLOW_STATUS_UPDATED_AT] as string
    ).isValid()
      ? moment(doc[ALERT_WORKFLOW_STATUS_UPDATED_AT] as string).toISOString()
      : undefined,
    connector_id: (apiConfig.connector_id as string) ?? '',
    connector_name: (apiConfig.name as string) ?? '',
    details_markdown: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
      defaultValue: '' as const,
    }),
    entity_summary_markdown: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
      defaultValue: undefined,
    }),
    generation_uuid: (doc[ALERT_RULE_EXECUTION_UUID] as string) ?? '',
    id,
    mitre_attack_tactics: doc[ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS] as string[] | undefined,
    replacements: replacements
      ? Object.fromEntries(replacements.map((r) => [r.uuid, r.value]))
      : undefined,
    summary_markdown: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
      defaultValue: '' as const,
    }),
    timestamp: (doc[ALERT_START] as string | undefined) ?? new Date().toISOString(),
    title: getFieldWithReplacementThenRender({
      replacementField: ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
      normalField: ALERT_ATTACK_DISCOVERY_TITLE,
      defaultValue: '' as const,
    }),
  };
};
