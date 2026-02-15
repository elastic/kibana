/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { MalwareAnalysisConfig } from '../../lib/malware_analysis';
import { createMalwareAnalysisSkill } from './malware_analysis_skill';

interface RegisterSkillsOptions {
  malwareAnalysis?: MalwareAnalysisConfig;
}

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = async (
  agentBuilder: AgentBuilderPluginSetup,
  options: RegisterSkillsOptions = {}
): Promise<void> => {
  // await agentBuilder.skill.registerSkill(alertAnalysisSampleSkill);

  if (options.malwareAnalysis) {
    const malwareAnalysisSkill = createMalwareAnalysisSkill(options.malwareAnalysis);
    await agentBuilder.skill.registerSkill(malwareAnalysisSkill);
  }
};
