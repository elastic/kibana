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
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

describe('endpointForensicAnalysisSkill', () => {
  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID)).toBe(true);
  });

  it('exposes ES|QL and index discovery platform registry tools only (read-only scope)', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];
    expect(registryTools).toEqual([
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ]);
  });

  it('does not define any inline tools — relies on platform.core.list_indices for discovery', async () => {
    const inlineTools = await endpointForensicAnalysisSkill.getInlineTools?.();
    expect(inlineTools ?? []).toHaveLength(0);
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

  // The skill recommends containment and stops there. Recommending is not executing, which
  // the content has to say explicitly or the read-only scope reads as "say nothing at all".
  describe('response-action recommendations', () => {
    it('advertises that it recommends response actions without executing them', () => {
      expect(endpointForensicAnalysisSkill.description).toContain(
        'Recommends containment response actions'
      );
      expect(endpointForensicAnalysisSkill.description).toContain('never executes them');
    });

    it('keeps recommending inside the read-only scope rather than as an exception to it', () => {
      expect(endpointForensicAnalysisSkill.content).toContain('MUST NOT invoke response actions');
      expect(endpointForensicAnalysisSkill.content).toContain('Recommending is not executing');
    });

    it('names the recommendation step and the fields each recommendation carries', () => {
      expect(endpointForensicAnalysisSkill.content).toContain('Recommend response actions');
      expect(endpointForensicAnalysisSkill.content).toContain('`rationale`');
      expect(endpointForensicAnalysisSkill.content).toContain('`priority`');
      expect(endpointForensicAnalysisSkill.content).toContain('`targets`');
    });

    // Pinned against `watch_deep.yaml`'s `recommendedActions` schema: an action type the
    // schema rejects is an action the worker silently drops.
    it.each([
      'isolate_host',
      'release_host',
      'scan_host',
      'list_running_processes',
      'hunt_indicator',
      'create_case',
      'block_indicator',
      'revoke_user_account',
    ])('offers the %s action type', (actionType) => {
      expect(endpointForensicAnalysisSkill.content).toContain(actionType);
    });

    // The Endpoint response-action scope excludes these by contract, so a recommendation
    // naming one proposes containment no executor accepts.
    it.each(['kill_process', 'suspend_process', 'get_file', 'runscript', 'memory_dump'])(
      'does not offer the unsupported %s action type',
      (actionType) => {
        expect(endpointForensicAnalysisSkill.content).not.toContain(`\`${actionType}\` | \``);
      }
    );

    it('says plainly that the unsupported actions cannot be recommended', () => {
      expect(endpointForensicAnalysisSkill.content).toContain('are **not** supported');
    });

    // Following up on a host is what `followUpHosts` is for; duplicating it as an action
    // would put the same lead in front of a human twice, once to approve and once to run.
    it('keeps "investigate this host" out of the action vocabulary', () => {
      expect(endpointForensicAnalysisSkill.content).toContain('is **not** a response action');
      expect(endpointForensicAnalysisSkill.content).toContain('`followUpHosts`');
    });

    it.each(['immediate', 'investigation', 'hardening'])('offers the %s priority', (priority) => {
      expect(endpointForensicAnalysisSkill.content).toContain(priority);
    });

    it('asks for a structured list only when the caller requested one', () => {
      expect(endpointForensicAnalysisSkill.content).toContain('`recommendedActions`');
      expect(endpointForensicAnalysisSkill.content).toContain('Return an empty array');
    });

    it('recommends nothing when the reconstruction found nothing', () => {
      expect(endpointForensicAnalysisSkill.content).toContain('gets no list at all');
    });
  });
});
