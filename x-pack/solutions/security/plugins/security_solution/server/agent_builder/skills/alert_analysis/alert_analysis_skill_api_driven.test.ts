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

  it('documents that Elasticsearch lookups are not proxied through kibana.request', () => {
    expect(alertAnalysisApiDrivenSkill.content).toContain(
      'Do **NOT** proxy standard Elasticsearch reads through `kibana.request`'
    );
  });
});
