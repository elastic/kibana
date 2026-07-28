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
  findThreatReportsTool,
  createThreatReportTool,
  huntOrchestratorTool,
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
    'analyst-pasted reports. Run a threat hunt FOR A SPECIFIC REPORT — sweeps the environment ' +
    'for its IOCs/techniques AND proposes durable behavioral detection rules from the ' +
    'techniques described in that report, by extracting MITRE ATT&CK techniques with an LLM ' +
    'and validating them against the canonical Kibana ATT&CK catalog. Generalize sets of ' +
    'brittle alerts (firing on rotating IOCs) into durable behavioral rules. ' +
    'Manage scheduled email/Slack digest subscriptions. ' +
    'Use when the user asks about: threat intel, CISO News, weekly digest, emerging threats, ' +
    'CVE in the wild, vendor advisory, incident postmortem, "run a threat hunt for this ' +
    'report/advisory/paste", hunt for the behavior class, build a durable detection from this ' +
    'hash, generalize this alert, or this alert keeps firing on rotating hashes. NOT for a ' +
    'hypothesis-driven hunt with no source report/advisory in hand — that is the ' +
    '`threat-hunting` skill.',
  content: `# Threat Intelligence Skill\n\n${loadThreatIntelligenceSkillMarkdown('kibana')}`,
  // `hunt_orchestrator` is inline (not `hunt_behavior`) so the model sees the
  // one-call Tier1+Tier2 orchestrator by default without a registry lookup —
  // live testing showed description wording alone did not change routing;
  // the model reliably picks whichever hunt tool is immediately visible.
  // `hunt_behavior` remains callable via getRegistryTools() below for the
  // "Tier 1 already done" / "skip the IOC sweep" case.
  getInlineTools: () => [
    findThreatReportsTool,
    createThreatReportTool,
    huntOrchestratorTool,
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
    THREAT_INTEL_TOOL_IDS.huntBehavior,
    THREAT_INTEL_TOOL_IDS.synthesizeAdvisory,
    platformCoreTools.cases,
  ],
});
