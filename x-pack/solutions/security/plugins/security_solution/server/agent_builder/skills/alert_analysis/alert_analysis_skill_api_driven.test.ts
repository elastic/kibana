/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH } from '../../../../common/api/alert_analysis/related_alerts';
import {
  alertAnalysisApiDrivenSkill,
  WORKFLOW_EXECUTE_STEP_TOOL_ID,
} from './alert_analysis_skill_api_driven';

describe('alertAnalysisApiDrivenSkill', () => {
  it('has stable skill identity', () => {
    expect(alertAnalysisApiDrivenSkill.id).toBe('alert-analysis');
    expect(alertAnalysisApiDrivenSkill.name).toBe('alert-analysis');
    expect(alertAnalysisApiDrivenSkill.basePath).toBe('skills/security/alerts');
  });

  it('validates successfully', async () => {
    await expect(validateSkillDefinition(alertAnalysisApiDrivenSkill)).resolves.toBeDefined();
  });

  it('registers workflow execute step tool for kibana.request invocation', () => {
    const tools = alertAnalysisApiDrivenSkill.getRegistryTools?.();
    expect(tools).toBeDefined();
    expect(tools).toContain(WORKFLOW_EXECUTE_STEP_TOOL_ID);
  });

  it('does not define inline tools', () => {
    expect(alertAnalysisApiDrivenSkill.getInlineTools).toBeUndefined();
  });

  it('documents the related-alerts internal API path', () => {
    expect(alertAnalysisApiDrivenSkill.content).toContain(
      ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH
    );
  });

  it('documents the hard rule against pre-fetching with security.alerts when alertId is present', () => {
    expect(alertAnalysisApiDrivenSkill.content).toContain(
      'When an `alertId` is present, call `workflow_execute_step` **directly**'
    );
    expect(alertAnalysisApiDrivenSkill.content).toContain(
      'Do NOT first call `security.alerts` to "fetch alert context"'
    );
  });

  it('documents that registry tools must not be nested as workflow step types', () => {
    expect(alertAnalysisApiDrivenSkill.content).toContain(
      'NEVER nest them as `type: security.alerts`'
    );
  });

  it('documents the short-circuit-on-error rule', () => {
    expect(alertAnalysisApiDrivenSkill.content).toContain(
      'STOP and report the error verbatim. Do NOT verify by listing all alerts'
    );
  });
});
