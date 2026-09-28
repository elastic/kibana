/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  ALERT_ANALYSIS_WORKFLOW_API_VERSION,
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
  type AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody,
  type AlertAnalysisWorkflowSettings,
  type RuleAttachmentFilter,
  type RuleAttachmentPage,
  type RuleAttachmentSelection,
  type RuleAttachmentStats,
  type RuleAttachmentSummary,
  type UpdateRuleAttachmentsResult,
} from '../../../../../common/workflows/alert_analysis_workflow';

export {
  ALERT_ANALYSIS_WORKFLOW_API_VERSION,
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
};

export type { AlertAnalysisWorkflowSettings };
export type {
  RuleAttachmentFilter,
  RuleAttachmentPage,
  RuleAttachmentSelection,
  RuleAttachmentStats,
  RuleAttachmentSummary,
  UpdateRuleAttachmentsResult,
};

export type AlertAnalysisWorkflowSettingsWithConnector = AlertAnalysisWorkflowSettings & {
  connectorId?: string;
  workflowEnabled?: boolean;
  createConversation?: boolean;
};

export interface AlertAnalysisWorkflowSettingsWithConnectorResponse {
  settings: AlertAnalysisWorkflowSettingsWithConnector;
  workflowId: string;
}

export const fetchAlertAnalysisWorkflowSettings = ({
  http,
}: {
  http: HttpStart;
}): Promise<AlertAnalysisWorkflowSettingsWithConnectorResponse> => {
  return http.fetch<AlertAnalysisWorkflowSettingsWithConnectorResponse>(
    ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
    {
      method: 'GET',
      version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
    }
  );
};

export const saveAlertAnalysisWorkflowSettings = ({
  http,
  settings,
}: {
  http: HttpStart;
  settings: AlertAnalysisWorkflowSettingsWithConnector;
}): Promise<AlertAnalysisWorkflowSettingsWithConnectorResponse> => {
  return http.fetch<AlertAnalysisWorkflowSettingsWithConnectorResponse>(
    ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
    {
      method: 'PUT',
      version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
      body: JSON.stringify(settings),
    }
  );
};

export const fetchAlertAnalysisWorkflowRuleAttachments = ({
  http,
  search,
  attachmentFilter,
  page,
  perPage,
}: {
  http: HttpStart;
  search: string;
  attachmentFilter: RuleAttachmentFilter;
  page: number;
  perPage: number;
}): Promise<RuleAttachmentPage> => {
  return http.fetch<RuleAttachmentPage>(ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE, {
    method: 'GET',
    version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
    query: {
      search,
      attachment_filter: attachmentFilter,
      page,
      per_page: perPage,
    },
  });
};

export const fetchAlertAnalysisWorkflowRuleAttachmentStats = ({
  http,
  search,
  attachmentFilter,
}: {
  http: HttpStart;
  search: string;
  attachmentFilter: RuleAttachmentFilter;
}): Promise<RuleAttachmentStats> => {
  return http.fetch<RuleAttachmentStats>(ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE, {
    method: 'GET',
    version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
    query: { search, attachment_filter: attachmentFilter },
  });
};

export const fetchAlertAnalysisWorkflowRuleAttachmentSelection = ({
  http,
  search,
  attachmentFilter,
}: {
  http: HttpStart;
  search: string;
  attachmentFilter: RuleAttachmentFilter;
}): Promise<RuleAttachmentSelection> => {
  return http.fetch<RuleAttachmentSelection>(ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE, {
    method: 'GET',
    version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
    query: { search, attachment_filter: attachmentFilter },
  });
};

export const updateAlertAnalysisWorkflowRuleAttachments = ({
  http,
  attachRuleIds,
  detachRuleIds,
  dryRun,
}: {
  http: HttpStart;
  attachRuleIds: string[];
  detachRuleIds: string[];
  dryRun?: boolean;
}): Promise<UpdateRuleAttachmentsResult> => {
  const body: AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody = {
    attachRuleIds,
    detachRuleIds,
    dryRun: dryRun ?? false,
  };

  return http.fetch<UpdateRuleAttachmentsResult>(ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE, {
    method: 'POST',
    version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
    body: JSON.stringify(body),
  });
};
