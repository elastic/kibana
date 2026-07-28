/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deepWatchForensicsSkill,
  DEEP_WATCH_FORENSICS_SKILL_ID,
  DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID,
  DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID,
  DEEP_WATCH_FORENSICS_REPORTS_INDEX,
  DEEP_WATCH_OSQUERY_TOOL_IDS,
} from './deep_watch_forensics_skill';

describe('deep_watch_forensics_skill', () => {
  describe('skill definition', () => {
    it('has the expected skill ID', () => {
      expect(DEEP_WATCH_FORENSICS_SKILL_ID).toBe('deep-watch-forensics');
    });

    it('has the expected tool IDs', () => {
      expect(DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID).toBe('security.deep_watch.package_evidence');
      expect(DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID).toBe(
        'security.deep_watch.produce_draft_forensic_report'
      );
    });

    it('exports the reports index constant', () => {
      expect(DEEP_WATCH_FORENSICS_REPORTS_INDEX).toBe('.kibana-deep-watch-forensics-reports');
    });

    it('binds the osquery live-state tools, including resolve_agent_ids', () => {
      expect(DEEP_WATCH_OSQUERY_TOOL_IDS).toContain('osquery.check_integration');
      expect(DEEP_WATCH_OSQUERY_TOOL_IDS).toContain('osquery.run_live_query');
      expect(DEEP_WATCH_OSQUERY_TOOL_IDS).toContain('osquery.resolve_agent_ids');
    });

    it('defines the skill with correct id and name', () => {
      expect(deepWatchForensicsSkill.id).toBe(DEEP_WATCH_FORENSICS_SKILL_ID);
      expect(deepWatchForensicsSkill.name).toBe(DEEP_WATCH_FORENSICS_SKILL_ID);
    });

    it('has a non-empty description', () => {
      expect(deepWatchForensicsSkill.description.length).toBeGreaterThan(50);
    });

    it('description mentions DRAFT and specialist review', () => {
      expect(deepWatchForensicsSkill.description.toLowerCase()).toContain('draft');
      expect(deepWatchForensicsSkill.description.toLowerCase()).toContain('specialist');
    });

    it('description mentions human review', () => {
      expect(deepWatchForensicsSkill.description.toLowerCase()).toContain('human review');
    });

    it('description disambiguates from threat-hunting', () => {
      // Should mention threat-hunting as a handoff target, not claim to do fleet-wide hunting itself
      expect(deepWatchForensicsSkill.description.toLowerCase()).toContain('threat-hunting');
    });

    it('content includes the three-Watch flow', () => {
      expect(deepWatchForensicsSkill.content).toContain('Three-Watch Flow');
      expect(deepWatchForensicsSkill.content).toContain('Dark Watch');
      expect(deepWatchForensicsSkill.content).toContain('Deep Watch');
    });

    it('content includes FR-082 draft labeling requirement', () => {
      expect(deepWatchForensicsSkill.content).toContain('FR-082');
      expect(deepWatchForensicsSkill.content).toContain('DRAFT');
    });

    it('content includes FR-007 no-execution requirement', () => {
      expect(deepWatchForensicsSkill.content).toContain('FR-007');
    });

    it('content includes FR-DP-06 no-fabrication requirement', () => {
      expect(deepWatchForensicsSkill.content).toContain('FR-DP-06');
    });
  });

  describe('registry tools', () => {
    it('registers the platform ES|QL tools plus the osquery live-state toolset', async () => {
      const tools = (await deepWatchForensicsSkill.getRegistryTools?.()) ?? [];
      // Registry tools are string IDs, not objects
      const toolIds = tools as unknown as string[];
      expect(toolIds).toHaveLength(3 + DEEP_WATCH_OSQUERY_TOOL_IDS.length);
      expect(toolIds).toContain('platform.core.generate_esql');
      expect(toolIds).toContain('platform.core.execute_esql');
      expect(toolIds).toContain('platform.core.get_index_mapping');
      for (const osqueryToolId of DEEP_WATCH_OSQUERY_TOOL_IDS) {
        expect(toolIds).toContain(osqueryToolId);
      }
    });

    it('does not register search or relevance_search (skill guardrail)', async () => {
      const tools = (await deepWatchForensicsSkill.getRegistryTools?.()) ?? [];
      const toolIds = tools as unknown as string[];
      expect(toolIds).not.toContain('platform.core.search');
      expect(toolIds).not.toContain('relevance_search');
    });
  });

  describe('inline tools', () => {
    it('defines package_evidence and produce_draft_forensic_report tools', async () => {
      const tools = (await deepWatchForensicsSkill.getInlineTools?.()) ?? [];
      expect(tools.length).toBe(2);
      const toolIds = tools.map((t: { id: string }) => t.id);
      expect(toolIds).toContain(DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID);
      expect(toolIds).toContain(DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID);
    });

    it('package_evidence tool has a description mentioning evidence packaging', async () => {
      const tools = (await deepWatchForensicsSkill.getInlineTools?.()) ?? [];
      const pkgTool = tools.find(
        (t: { id: string }) => t.id === DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID
      );
      expect(pkgTool).toBeDefined();
      expect(pkgTool!.description.toLowerCase()).toContain('evidence');
    });

    it('produce_draft tool has a description mentioning DRAFT and FR-082', async () => {
      const tools = (await deepWatchForensicsSkill.getInlineTools?.()) ?? [];
      const draftTool = tools.find(
        (t: { id: string }) => t.id === DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID
      );
      expect(draftTool).toBeDefined();
      expect(draftTool!.description).toContain('DRAFT');
      expect(draftTool!.description).toContain('FR-082');
    });
  });
});
