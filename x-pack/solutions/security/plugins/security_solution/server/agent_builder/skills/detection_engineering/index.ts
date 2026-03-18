/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  detectionEngineeringContent,
  detectionBestPracticesContent,
  mitreGuidanceContent,
} from './content';
import { findRulesTool } from '../../tools/find_rules_tool';
import { manageRulesTool } from '../../tools/manage_rules_tool';
import { previewRuleTool } from '../../tools/preview_rule_tool';
import { manageExceptionsTool } from '../../tools/manage_exceptions_tool';
import { coverageOverviewTool } from '../../tools/coverage_overview_tool';
import { ruleMonitoringTool } from '../../tools/rule_monitoring_tool';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools/alerts_tool';
import { SECURITY_CREATE_DETECTION_RULE_TOOL_ID } from '../../tools/create_detection_rule_tool';
import { SECURITY_LABS_SEARCH_TOOL_ID } from '../../tools/security_labs_search_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

export interface DetectionEngineeringSkillContext {
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
}

export const getDetectionEngineeringSkill = ({ core, logger }: DetectionEngineeringSkillContext) =>
  defineSkillType({
    id: 'detection-engineering',
    name: 'detection-engineering',
    basePath: 'skills/security/alerts/rules',
    description: `End-to-end detection engineering: analyze threats, create detection rules, assess MITRE ATT&CK coverage, test and preview rules, tune noisy rules with exceptions, monitor rule health, and onboard prebuilt Elastic rules. Covers full detection lifecycle from threat report to production deployment.`,
    content: detectionEngineeringContent,
    referencedContent: [
      {
        relativePath: './reference',
        name: 'detection-best-practices',
        content: detectionBestPracticesContent,
      },
      {
        relativePath: './reference',
        name: 'mitre-mapping-guide',
        content: mitreGuidanceContent,
      },
    ],
    getRegistryTools: () => [
      SECURITY_ALERTS_TOOL_ID,
      SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      platformCoreTools.cases,
      platformCoreTools.executeEsql,
      platformCoreTools.generateEsql,
    ],
    getInlineTools: () => [
      findRulesTool(core, logger),
      manageRulesTool(core, logger),
      previewRuleTool(core, logger),
      manageExceptionsTool(core, logger),
      coverageOverviewTool(core, logger),
      ruleMonitoringTool(core, logger),
    ],
  });
