/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import { encode } from '@kbn/rison';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { KNOWLEDGE_BASE_TAB } from '@kbn/elastic-assistant/impl/assistant/settings/const';
import type { useNavigateToAlertsPageWithFilters } from '../../../../hooks/navigate_to_alerts_page_with_filters/use_navigate_to_alerts_page_with_filters';
import { URL_PARAM_KEY } from '../../../../hooks/navigate_to_alerts_page_with_filters/constants';
import { getDetectionEngineUrl } from './link_to/redirect_to_detection_engine';
import {
  ALERTS_PAGE_FILTER_ACKNOWLEDGED,
  ALERTS_PAGE_FILTER_OPEN,
} from '../../../../common/constants';
/**
 * Opens the AI4DSOC alert summary page, filtered by alertId
 */
const openAlertSummaryPageByAlertId = (
  navigateToApp: ApplicationStart['navigateToApp'],
  alertId: string
) => {
  const kqlAppQuery = encode({
    language: 'kuery',
    query: `_id: ${alertId}`,
  });

  const urlParams = new URLSearchParams({
    [URL_PARAM_KEY.appQuery]: kqlAppQuery,
  });

  return navigateToApp('securitySolutionUI', {
    deepLinkId: SecurityPageName.alertSummary,
    path: getDetectionEngineUrl(urlParams.toString()),
    openInNewTab: true,
  });
};

/**
 * Opens the Security Alerts page, triggering the flyout for an alertId.
 */
const openAlertPageByAlertId = (
  navigateToApp: ApplicationStart['navigateToApp'],
  alertId: string
) =>
  navigateToApp('security', {
    path: `alerts/redirect/${alertId}`,
    openInNewTab: true,
  });

export const openAlertsPageByAlertId = (
  navigateToApp: ApplicationStart['navigateToApp'],
  alertId: string,
  hasSearchAILakeConfigurations: boolean
) => {
  if (hasSearchAILakeConfigurations) {
    return openAlertSummaryPageByAlertId(navigateToApp, alertId);
  }
  return openAlertPageByAlertId(navigateToApp, alertId);
};

/**
 * Opens the AI4DSOC alert summary page with filters for open and acknowledged alerts
 */
const openAlertSummaryPage = (navigateToApp: ApplicationStart['navigateToApp']) => {
  const kqlAppQuery = encode({
    language: 'kuery',
    query: `kibana.alert.workflow_status: ${ALERTS_PAGE_FILTER_OPEN} OR kibana.alert.workflow_status: ${ALERTS_PAGE_FILTER_ACKNOWLEDGED}`,
  });

  const urlParams = new URLSearchParams({
    [URL_PARAM_KEY.appQuery]: kqlAppQuery,
  });

  return navigateToApp('securitySolutionUI', {
    deepLinkId: SecurityPageName.alertSummary,
    path: getDetectionEngineUrl(urlParams.toString()),
    openInNewTab: true,
  });
};

/**
 * Opens the Security Alerts page with filters for open and acknowledged alerts.
 */
const openAlertsPage = (
  openAlertsPageWithFilters: ReturnType<typeof useNavigateToAlertsPageWithFilters>
) =>
  openAlertsPageWithFilters(
    {
      selected_options: [ALERTS_PAGE_FILTER_OPEN, ALERTS_PAGE_FILTER_ACKNOWLEDGED],
      field_name: 'kibana.alert.workflow_status',
      persist: false,
    },
    true,
    '(global:(timerange:(fromStr:now-24h,kind:relative,toStr:now)))'
  );

export const openAlertsPageByOpenAndAck = (
  navigateToApp: ApplicationStart['navigateToApp'],
  openAlertsPageWithFilters: ReturnType<typeof useNavigateToAlertsPageWithFilters>,
  hasSearchAILakeConfigurations: boolean
) => {
  if (hasSearchAILakeConfigurations) {
    return openAlertSummaryPage(navigateToApp);
  }
  openAlertsPage(openAlertsPageWithFilters);
};

/**
 * Opens the AI4DSOC knowledge base management page, filtered by knowledgeBaseEntryId.
 */
const openAI4DSOCKnowledgeBasePage = (
  navigateToApp: ApplicationStart['navigateToApp'],
  knowledgeBaseEntryId: string
) => {
  return navigateToApp('securitySolutionUI', {
    deepLinkId: SecurityPageName.configurationsAiSettings,
    path: `?tab=${KNOWLEDGE_BASE_TAB}&entry_search_term=${knowledgeBaseEntryId}`,
    openInNewTab: true,
  });
};

/**
 * Opens the Stack management knowledge base management page
 */
const openKnowledgeBasePage = (
  navigateToApp: ApplicationStart['navigateToApp'],
  knowledgeBaseEntryId: string
) =>
  navigateToApp('management', {
    path: `ai/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}&entry_search_term=${knowledgeBaseEntryId}`,
    openInNewTab: true,
  });

export const openKnowledgeBasePageByEntryId = (
  navigateToApp: ApplicationStart['navigateToApp'],
  knowledgeBaseEntryId: string,
  hasSearchAILakeConfigurations: boolean
) => {
  if (hasSearchAILakeConfigurations) {
    return openAI4DSOCKnowledgeBasePage(navigateToApp, knowledgeBaseEntryId);
  }
  return openKnowledgeBasePage(navigateToApp, knowledgeBaseEntryId);
};
