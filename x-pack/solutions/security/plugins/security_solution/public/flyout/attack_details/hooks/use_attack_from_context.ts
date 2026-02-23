/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';
import { normalizeToStringArray } from './use_header_data';

const FIELD_TITLE = 'kibana.alert.attack_discovery.title' as const;
const FIELD_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;
const FIELD_REPLACEMENTS = 'kibana.alert.attack_discovery.replacements' as const;
const FIELD_SUMMARY_MARKDOWN = 'kibana.alert.attack_discovery.summary_markdown' as const;
const FIELD_DETAILS_MARKDOWN = 'kibana.alert.attack_discovery.details_markdown' as const;
/** Connector id is stored under api_config in the alert document */
const FIELD_CONNECTOR_ID = 'kibana.alert.attack_discovery.api_config.connector_id' as const;
/** Connector name is stored as api_config.name in the alert document */
const FIELD_CONNECTOR_NAME = 'kibana.alert.attack_discovery.api_config.name' as const;
/** Generation uuid is stored as rule execution uuid in the alert document */
const FIELD_GENERATION_UUID = 'kibana.alert.rule.execution.uuid' as const;
const FIELD_WORKFLOW_STATUS = 'kibana.alert.workflow_status' as const;
const FIELD_TIMESTAMP = '@timestamp' as const;

const EMPTY_REPLACEMENTS: Record<string, string> = {};

/**
 * Builds an AttackDiscoveryAlert from flyout context (getFieldsData) so that
 * the Take Action footer can reuse several components from Attacks page that require this format.
 * Returns null when required fields (title, summary, details, timestamp) are missing.
 * Uses fallback empty strings for connector/generation when not in the document (e.g. older alerts).
 */
export const useAttackFromContext = (): AttackDiscoveryAlert | null => {
  const { attackId, getFieldsData } = useAttackDetailsContext();

  return useMemo(() => {
    if (!attackId) {
      return null;
    }

    const title = getField(getFieldsData(FIELD_TITLE));
    const summaryMarkdown = getField(getFieldsData(FIELD_SUMMARY_MARKDOWN));
    const detailsMarkdown = getField(getFieldsData(FIELD_DETAILS_MARKDOWN));
    const timestamp = getField(getFieldsData(FIELD_TIMESTAMP));

    if (
      !title ||
      summaryMarkdown == null ||
      summaryMarkdown === '' ||
      detailsMarkdown == null ||
      detailsMarkdown === '' ||
      !timestamp
    ) {
      return null;
    }

    const connectorId = getField(getFieldsData(FIELD_CONNECTOR_ID)) ?? '';
    const connectorName = getField(getFieldsData(FIELD_CONNECTOR_NAME)) ?? '';
    const generationUuid = getField(getFieldsData(FIELD_GENERATION_UUID)) ?? attackId;

    const alertIds = normalizeToStringArray(getFieldsData(FIELD_ALERT_IDS));
    const replacementsValue = getFieldsData(FIELD_REPLACEMENTS);
    const replacements =
      replacementsValue &&
      typeof replacementsValue === 'object' &&
      !Array.isArray(replacementsValue)
        ? (replacementsValue as Record<string, string>)
        : EMPTY_REPLACEMENTS;

    const assigneesValue = getFieldsData(ALERT_WORKFLOW_ASSIGNEE_IDS) as
      | string[]
      | string
      | undefined;
    const assignees = normalizeToStringArray(assigneesValue);
    const workflowStatus = getField(getFieldsData(FIELD_WORKFLOW_STATUS));
    const tagsValue = getFieldsData('kibana.alert.tags') as string[] | string | undefined;
    const tags = normalizeToStringArray(tagsValue);

    const attack: AttackDiscoveryAlert = {
      id: attackId,
      title,
      alertIds: [...new Set(alertIds)],
      connectorId,
      connectorName,
      generationUuid,
      summaryMarkdown,
      detailsMarkdown,
      timestamp,
      replacements: Object.keys(replacements).length > 0 ? replacements : undefined,
      alertWorkflowStatus: workflowStatus ?? undefined,
      assignees: assignees.length > 0 ? assignees : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    return attack;
  }, [attackId, getFieldsData]);
};
