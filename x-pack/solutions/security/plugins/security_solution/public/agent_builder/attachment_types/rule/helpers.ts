/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import { RULES_PATH } from '../../../../common/constants';
import {
  ML_TYPE_DESCRIPTION,
  EQL_TYPE_DESCRIPTION,
  QUERY_TYPE_DESCRIPTION,
  THRESHOLD_TYPE_DESCRIPTION,
  THREAT_MATCH_TYPE_DESCRIPTION,
  NEW_TERMS_TYPE_DESCRIPTION,
  ESQL_TYPE_DESCRIPTION,
  QUERY_LABEL,
  EQL_QUERY_LABEL,
  ESQL_QUERY_LABEL,
  SAVED_QUERY_LABEL,
} from './translations';

export type RuleAttachment = Attachment<string, { text: string; attachmentLabel?: string }>;

export const isOnRuleFormPage = (pathname: string): boolean =>
  pathname.includes(RULES_PATH) && (pathname.includes('/create') || pathname.includes('/edit'));

/** Resolve the Kibana rule id for save/navigation from all available sources. */
export const getSavedRuleId = (
  rule: RuleResponse | null | undefined,
  lastSavedRuleId?: string | null,
  attachmentOrigin?: string | null
): string | undefined => rule?.id ?? attachmentOrigin ?? lastSavedRuleId ?? undefined;

export const parseRuleFromAttachment = (attachment: RuleAttachment): RuleResponse | null => {
  try {
    const parsed = JSON.parse(attachment.data.text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as RuleResponse;
  } catch {
    return null;
  }
};

export const getRuleName = (attachment: RuleAttachment): string | undefined => {
  if (attachment?.data?.attachmentLabel) {
    return attachment.data.attachmentLabel;
  }
  return parseRuleFromAttachment(attachment)?.name;
};

export const getRuleTypeLabel = (ruleType: string): string => {
  switch (ruleType) {
    case 'machine_learning':
      return ML_TYPE_DESCRIPTION;
    case 'query':
    case 'saved_query':
      return QUERY_TYPE_DESCRIPTION;
    case 'eql':
      return EQL_TYPE_DESCRIPTION;
    case 'threshold':
      return THRESHOLD_TYPE_DESCRIPTION;
    case 'threat_match':
      return THREAT_MATCH_TYPE_DESCRIPTION;
    case 'new_terms':
      return NEW_TERMS_TYPE_DESCRIPTION;
    case 'esql':
      return ESQL_TYPE_DESCRIPTION;
    default:
      return ruleType;
  }
};

export const getQueryLabel = (rule: RuleResponse): string => {
  switch (rule.type) {
    case 'eql':
      return EQL_QUERY_LABEL;
    case 'esql':
      return ESQL_QUERY_LABEL;
    case 'saved_query':
      return SAVED_QUERY_LABEL;
    default:
      return QUERY_LABEL;
  }
};
