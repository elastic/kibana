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

export type RuleAttachmentIntent = 'create' | 'update';

export type RuleAttachment = Attachment<
  string,
  {
    text: string;
    attachmentLabel?: string;
    /** Saved-rule id — persisted by the browser save handler and survives agent shallow merges. */
    ruleId?: string;
    /**
     * Per-version intent, frozen at write time. 'create' stays 'create' forever (even after the
     * rule is saved) so the button label never flips; a duplicate-save warning is shown instead.
     * Absent on legacy attachments — falls back to ruleId/origin presence.
     */
    intent?: RuleAttachmentIntent;
  }
>;

export const isOnRuleFormPage = (pathname: string): boolean =>
  pathname.includes(RULES_PATH) && (pathname.includes('/create') || pathname.includes('/edit'));

/** Rule id encoded in a rule edit URL (`…/rules/id/<ruleId>/edit`). */
export const getRuleIdFromEditFormPath = (pathname: string): string | undefined => {
  if (!pathname.includes(RULES_PATH) || !pathname.includes('/edit')) {
    return undefined;
  }
  const match = pathname.match(/\/id\/([^/]+)\/edit/);
  return match ? decodeURIComponent(match[1]) : undefined;
};

/**
 * True when the open create/edit form is already showing this saved rule (same id in the URL).
 * Used to hide redundant "View rule" — not when the form is for a different rule.
 */
export const isAttachmentRuleOpenOnFormPage = (
  attachmentRuleId: string | undefined,
  pathname: string
): boolean => {
  if (!attachmentRuleId || !isOnRuleFormPage(pathname)) {
    return false;
  }
  if (pathname.includes('/create')) {
    return false;
  }
  const formRuleId = getRuleIdFromEditFormPath(pathname);
  return formRuleId !== undefined && formRuleId === attachmentRuleId;
};

/** Whether "View rule" should appear for an update-intent attachment with this rule id. */
export const shouldShowViewRuleButton = (
  attachmentRuleId: string | undefined,
  pathname: string
): boolean => {
  if (!attachmentRuleId) {
    return false;
  }
  return !isAttachmentRuleOpenOnFormPage(attachmentRuleId, pathname);
};

/**
 * Saved-rule id from the attachment. `data.ruleId` is primary; `origin` is a legacy fallback
 * used only when resolving the rule id for navigation/save targets — NOT for intent detection.
 */
export const getRuleIdFromAttachment = (attachment: RuleAttachment): string | undefined =>
  attachment.data?.ruleId ?? (attachment as { origin?: string }).origin ?? undefined;

/**
 * Effective intent: 'create' for a new rule, 'update' for a saved one.
 * `data.intent` is authoritative (frozen at write time).
 * Legacy fallback: only `data.ruleId` (not `origin`) signals a prior save — `origin` is a
 * server-side linkage that persists across sessions and must not flip the label to "Update rule"
 * when the user is asking to create a fresh rule in an existing conversation.
 */
export const getRuleAttachmentIntent = (attachment: RuleAttachment): RuleAttachmentIntent => {
  const dataIntent = attachment.data?.intent;
  if (dataIntent === 'create' || dataIntent === 'update') {
    return dataIntent;
  }
  // Use only data.ruleId (not origin) so that an old conversation's origin from a previous save
  // does not incorrectly show "Update rule" when the user intends to create a new rule.
  return attachment.data?.ruleId ? 'update' : 'create';
};

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
