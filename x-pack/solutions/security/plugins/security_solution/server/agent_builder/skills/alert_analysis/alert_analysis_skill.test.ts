/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertAnalysisSkill, WORKFLOW_EXECUTE_STEP_TOOL_ID } from './alert_analysis_skill';
import { ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH } from '../../../../common/api/alert_analysis/related_alerts';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../../tools';

describe('alertAnalysisSkill', () => {
  it('has the correct skill id', () => {
    expect(alertAnalysisSkill.id).toBe('alert-analysis');
  });

  it('registers security.alerts, security_labs_search, entity_risk_score, and workflow_execute_step tools', () => {
    const tools = alertAnalysisSkill.getRegistryTools();
    expect(tools).toContain(SECURITY_ALERTS_TOOL_ID);
    expect(tools).toContain(SECURITY_LABS_SEARCH_TOOL_ID);
    expect(tools).toContain(SECURITY_ENTITY_RISK_SCORE_TOOL_ID);
    expect(tools).toContain(WORKFLOW_EXECUTE_STEP_TOOL_ID);
  });

  it('does not register any inline tools (correlation goes through workflow_execute_step)', () => {
    expect(alertAnalysisSkill.getInlineTools).toBeUndefined();
  });

  it('includes the related alerts API path in skill content', () => {
    expect(alertAnalysisSkill.content).toContain(ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH);
  });

  it('includes YAML template for workflow_execute_step in skill content', () => {
    expect(alertAnalysisSkill.content).toContain('workflow_execute_step');
    expect(alertAnalysisSkill.content).toContain('kibana.request');
    expect(alertAnalysisSkill.content).toContain('alertId');
  });
});
