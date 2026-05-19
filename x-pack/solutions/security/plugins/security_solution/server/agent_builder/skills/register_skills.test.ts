/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { registerSkills } from './register_skills';

jest.mock('./alert_analysis', () => ({
  alertAnalysisSkill: { id: 'alert-analysis' },
}));

jest.mock('./threat_hunting', () => ({
  threatHuntingSkill: { id: 'threat-hunting' },
}));

jest.mock('./automatic_troubleshooting', () => ({
  createAutomaticTroubleshootingSkill: jest.fn(() => ({ id: 'automatic-troubleshooting' })),
}));

jest.mock('./detection_rule_edit', () => ({
  getDetectionRuleEditSkill: jest.fn(() => ({ id: 'detection-rule-edit' })),
}));

jest.mock('./entity_analytics', () => ({
  getEntityAnalyticsSkill: jest.fn(() => ({ id: 'entity-analytics' })),
}));

jest.mock('./find_security_ml_jobs', () => ({
  findSecurityMlJobsSkill: jest.fn(() => ({ id: 'find-security-ml-jobs' })),
}));

jest.mock('./pci_compliance', () => ({
  pciComplianceSkill: { id: 'pci-compliance' },
}));

describe('registerSkills', () => {
  const register = jest.fn(async () => undefined);

  const baseArgs = {
    agentBuilder: { skills: { register } },
    getStartServices: jest.fn(),
    kibanaVersion: '9.9.9',
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    ml: undefined,
    options: { endpointAppContextService: {} },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers alert-analysis skill unconditionally', async () => {
    const experimentalFeatures = {
      automaticTroubleshootingSkill: false,
      entityAnalyticsEntityStoreV2: false,
      pciComplianceAgentBuilder: false,
    } as ExperimentalFeatures;

    await registerSkills({
      ...baseArgs,
      experimentalFeatures,
    });

    const ids = register.mock.calls.map(([skill]) => skill.id);
    expect(ids).toContain('alert-analysis');
    expect(ids).toContain('threat-hunting');
  });

  it('registers pci-compliance skill only when experimental flag is enabled', async () => {
    const experimentalFeatures = {
      automaticTroubleshootingSkill: false,
      entityAnalyticsEntityStoreV2: false,
      pciComplianceAgentBuilder: true,
    } as ExperimentalFeatures;

    await registerSkills({
      ...baseArgs,
      experimentalFeatures,
    });

    const ids = register.mock.calls.map(([skill]) => skill.id);
    expect(ids).toContain('pci-compliance');
  });
});
