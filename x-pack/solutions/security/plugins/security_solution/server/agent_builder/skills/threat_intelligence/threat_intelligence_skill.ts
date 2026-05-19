/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  THREAT_INTELLIGENCE_SKILL_ID,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { loadThreatIntelligenceSkillMarkdown } from '../../../../common/threat_intelligence/skill/load_skill_content';
import {
  searchReportsTool,
  ingestReportTool,
  huntBehaviorTool,
  manageSubscriptionsTool,
  coverageGapTool,
  huntForThreatTool,
  generalizeFromTelemetryTool,
} from '../../tools/threat_intelligence';

/**
 * Source-agnostic threat intelligence skill.
 *
 * Skill markdown lives in `common/threat_intelligence/skill/`:
 * - `skill_common.md` — shared orchestration and API reference
 * - `skill_kibana.md` — Canvas, `renderTag`, Kibana-only flows
 *
 * To refresh the Cursor copy after edits: `yarn … sync:threat-intel-external-skill`
 */
export const threatIntelligenceSkill = defineSkillType({
  id: THREAT_INTELLIGENCE_SKILL_ID,
  name: THREAT_INTELLIGENCE_SKILL_ID,
  basePath: 'skills/security/intel',
  experimental: true,
  description:
    'Surface threat intelligence from external feeds (RSS, STIX/TAXII, vendor advisories) and ' +
    'analyst-pasted reports. Propose durable behavioral detection rules from the techniques ' +
    'described in those reports by extracting MITRE ATT&CK techniques with an LLM and validating ' +
    'them against the canonical Kibana ATT&CK catalog. Generalize sets of brittle alerts ' +
    '(firing on rotating IOCs) into durable behavioral rules. ' +
    'Manage scheduled email/Slack digest subscriptions. ' +
    'Use when the user asks about: threat intel, CISO News, weekly digest, emerging threats, ' +
    'CVE in the wild, vendor advisory, incident postmortem, hunt for the behavior class, ' +
    'build a durable detection from this hash, generalize this alert, or this alert keeps ' +
    'firing on rotating hashes.',
  content: `# Threat Intelligence Skill\n\n${loadThreatIntelligenceSkillMarkdown('kibana')}`,
  getInlineTools: () => [
    searchReportsTool,
    ingestReportTool,
    huntBehaviorTool,
    coverageGapTool,
    huntForThreatTool,
    manageSubscriptionsTool,
    generalizeFromTelemetryTool,
  ],
  getRegistryTools: () => [
    'security.create_detection_rule',
    'security.security_labs_search',
    THREAT_INTEL_TOOL_IDS.extractIocs,
    THREAT_INTEL_TOOL_IDS.analyseEnvironment,
    THREAT_INTEL_TOOL_IDS.huntOrchestrated,
    THREAT_INTEL_TOOL_IDS.synthesizeAdvisory,
    platformCoreTools.cases,
  ],
});
