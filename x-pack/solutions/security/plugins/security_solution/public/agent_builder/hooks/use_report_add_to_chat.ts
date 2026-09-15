/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';

export type BulkAlertPathway =
  | 'bulk_alerts_alerts_page'
  | 'bulk_alerts_rule_details'
  | 'bulk_alerts_alert_summary'
  | 'bulk_alerts_cases'
  | 'bulk_alerts_attack_discovery';

export interface AgentBuilderAddToChatTelemetry {
  /**
   * Pathway where "Add to Chat" was clicked
   */
  pathway:
    | 'alerts_flyout'
    | 'alerts_flyout_rule_summary'
    | 'alerts_table_rule_flyout'
    | 'entity_highlights'
    | 'entity_risk_contribution'
    | 'entity_flyout'
    | 'rule_creation'
    | 'rule_editing'
    | 'rule_details'
    | 'rule_failure'
    | 'rule_query_error'
    | 'attack_discovery_take_action'
    | 'attack_discovery_top'
    | 'attack_discovery_bottom'
    | 'attacks_page_group_summary'
    | 'attacks_page_group_take_action'
    | 'attacks_page_flyout_take_action'
    | BulkAlertPathway;
  /**
   * Attachment type
   */
  attachments?: Array<'alert' | 'entity' | 'rule'>;
  /** Number of items added (for bulk add-to-chat actions) */
  item_count?: number;
}

/**
 * returns a function that reports agent builder add to chat event
 */
export const useReportAddToChat = () => {
  const { telemetry } = useKibana().services;
  const reportAddToChatClick = useCallback(
    (payload: AgentBuilderAddToChatTelemetry) => {
      telemetry?.reportEvent(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, payload);
    },
    [telemetry]
  );

  return reportAddToChatClick;
};
