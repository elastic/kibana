/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';
export interface AgentBuilderAddToChatTelemetry {
  /**
   * Pathway where "Add to Chat" was clicked
   */
  pathway:
    | 'alerts_flyout'
    | 'entity_highlights'
    | 'entity_risk_contribution'
    | 'rules_table'
    | 'rule_creation'
    | 'rule_failure'
    | 'attack_discovery_take_action'
    | 'attack_discovery_top'
    | 'attack_discovery_bottom';
  /**
   * Attachment type
   */
  attachments?: Array<'alert' | 'entity' | 'rule'>;
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
