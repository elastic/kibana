/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import {
  ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS,
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

describe('endpointForensicAnalysisSkill', () => {
  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID)).toBe(true);
  });

  it('binds Osquery live-query tools so they are available when the skill loads', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];

    for (const osqueryToolId of ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS) {
      expect(registryTools).toContain(osqueryToolId);
    }

    expect(registryTools).toContain('osquery.run_live_query');
    expect(registryTools).toContain('osquery.get_live_query_results');
  });

  it('exposes ES|QL and index mapping platform registry tools (read-only scope)', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];

    expect(registryTools).toContain(platformCoreTools.getIndexMapping);
    expect(registryTools).toContain(platformCoreTools.generateEsql);
    expect(registryTools).toContain(platformCoreTools.executeEsql);
  });

  it('defines the discover_telemetry and extract_iocs inline tools', async () => {
    const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];

    expect(inlineTools.map((tool) => tool.id)).toEqual([
      'security.endpoint_forensic.discover_telemetry',
      'security.endpoint_forensic.extract_iocs',
    ]);
  });

  it('routes conflicting antivirus / configuration issues to elastic-defend-configuration-troubleshooting', () => {
    expect(endpointForensicAnalysisSkill.description).toContain('antivirus');
    expect(endpointForensicAnalysisSkill.description).toContain(
      'elastic-defend-configuration-troubleshooting'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Conflicting or incompatible security software'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('antivirus');
    expect(endpointForensicAnalysisSkill.content).toContain('Naming a specific host does');
    expect(endpointForensicAnalysisSkill.content).toContain(
      'elastic-defend-configuration-troubleshooting'
    );
  });

  it('does not present an unsupported attack sequence as a host chronology', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Only include events supported by query results'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'do **not** present an expected attack sequence as that host'
    );
  });

  it('routes the installed-but-unenrolled state to the ES|QL path (review finding 13)', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**If Osquery IS installed but NO agents are enrolled**'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('agents_enrolled: false');
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Do **not** call `osquery.run_live_query` — it has no agent to run on.'
    );
  });

  it('distinguishes an inconclusive capability check from "no agents"', () => {
    expect(endpointForensicAnalysisSkill.content).toContain('`enrollment_status` is `unknown`');
    expect(endpointForensicAnalysisSkill.content).toContain('NOT the same as "no agents"');
  });

  it('scopes discover_telemetry to the ES|QL path only (review finding 21)', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**On the ES|QL / Defend telemetry path only**'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('it is ES|QL-only');
    // The unconditional "call it first" phrasing is what made Process §1 and
    // Phase 0 contradict each other; it must be gone.
    expect(endpointForensicAnalysisSkill.content).not.toMatch(
      /^Call `[^`]+` first with host names/m
    );
  });

  it('requires resolve_agent_ids before dispatching a live query (review finding 16)', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**Always** call `osquery.resolve_agent_ids` before `osquery.run_live_query`'
    );
  });
});
