/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  pciComplianceAutonomousSkill,
  PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID,
  PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS,
} from './pci_compliance_autonomous_skill';
import {
  PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID,
  PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID,
  PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID,
  PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID,
} from '../../tools';
import { PCI_COMPLIANCE_TOOL_ID } from '../../tools/pci_compliance_tool';
import { PCI_SCOPE_DISCOVERY_TOOL_ID } from '../../tools/pci_scope_discovery_tool';
import { PCI_FIELD_MAPPER_TOOL_ID } from '../../tools/pci_field_mapper_tool';

/**
 * Contract tests for the autonomously-architected variant. Two-part surface:
 *  1. Domain-knowledge content (SAQ taxonomy, v3→v4 deltas, scope-reduction levers, technical-
 *     vs-process classification) authored by the autonomous architect.
 *  2. **Isolation property**: the autonomous skill must reference only autonomous-namespaced
 *     tool IDs and must NOT depend on the hand-written variant's tool IDs. This is the core
 *     end-to-end property — skill+tool autonomous stack — under test in the eval suite.
 */
describe('pciComplianceAutonomousSkill', () => {
  it('uses the dedicated autonomous skill id (separate from the hand-written variant)', () => {
    expect(pciComplianceAutonomousSkill.id).toBe(PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID);
    expect(PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID).toBe('pci-compliance-autonomous');
  });

  it('shares the security/compliance basePath with the hand-written variant', () => {
    expect(pciComplianceAutonomousSkill.basePath).toBe('skills/security/compliance');
  });

  it('has a non-empty description that anchors on PCI DSS v4.0.1 and CDE', () => {
    expect(pciComplianceAutonomousSkill.description.length).toBeGreaterThan(80);
    expect(pciComplianceAutonomousSkill.description).toContain('PCI DSS v4.0.1');
    expect(pciComplianceAutonomousSkill.description.toLowerCase()).toContain(
      'cardholder data environment'
    );
  });

  describe('content — v4.0.1 anchors', () => {
    it('references PCI DSS v4.0.1 and the June 2024 publication date', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('v4.0.1');
      expect(pciComplianceAutonomousSkill.content).toContain('June 2024');
    });

    it('captures all three v4.0.1 clarifications (matching hand-written sister)', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('critical-severity only');
      expect(pciComplianceAutonomousSkill.content).toContain('ALL CDE access');
      expect(pciComplianceAutonomousSkill.content).toContain('FIDO2');
    });
  });

  describe('content — domain knowledge from autonomous architect', () => {
    it('teaches the SAQ taxonomy as scoping guidance', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('SAQ');
      expect(pciComplianceAutonomousSkill.content).toContain('A-EP');
      expect(pciComplianceAutonomousSkill.content).toContain('D-MER');
    });

    it('captures the v3.2.1 → v4.0.1 net-new requirement set', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('3.4.1');
      expect(pciComplianceAutonomousSkill.content).toContain('8.4.2');
      expect(pciComplianceAutonomousSkill.content).toContain('11.4.1');
    });

    it('teaches scope-reduction levers in priority order', () => {
      expect(pciComplianceAutonomousSkill.content.toLowerCase()).toContain('tokenisation');
      expect(pciComplianceAutonomousSkill.content).toContain('P2PE');
      expect(pciComplianceAutonomousSkill.content).toContain('segmentation');
    });

    it('teaches the technical-vs-process requirement classification', () => {
      expect(pciComplianceAutonomousSkill.content.toLowerCase()).toContain('technical');
      expect(pciComplianceAutonomousSkill.content.toLowerCase()).toContain('process-based');
      expect(pciComplianceAutonomousSkill.content).toMatch(/human\s+attestation/);
    });
  });

  describe('content — verdict vocabulary and provenance', () => {
    it('documents the tiered RED/AMBER/GREEN status vocabulary', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('GREEN + HIGH confidence');
      expect(pciComplianceAutonomousSkill.content).toContain('RED + HIGH confidence');
      expect(pciComplianceAutonomousSkill.content).toContain('AMBER');
      expect(pciComplianceAutonomousSkill.content).toContain('NOT_ASSESSABLE');
    });

    it('documents the scopeClaim provenance record', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('scopeClaim');
    });

    it('references the autonomous tool IDs explicitly (not the hand-written ones)', () => {
      expect(pciComplianceAutonomousSkill.content).toContain(
        PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID
      );
      expect(pciComplianceAutonomousSkill.content).toContain(
        PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID
      );
      expect(pciComplianceAutonomousSkill.content).toContain(
        PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID
      );
      expect(pciComplianceAutonomousSkill.content).toContain(PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID);
    });

    it('does not reference any hand-written PCI tool IDs (skill+tool isolation)', () => {
      expect(pciComplianceAutonomousSkill.content).not.toContain(PCI_COMPLIANCE_TOOL_ID);
      expect(pciComplianceAutonomousSkill.content).not.toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
      expect(pciComplianceAutonomousSkill.content).not.toContain(PCI_FIELD_MAPPER_TOOL_ID);
    });
  });

  describe('getRegistryTools', () => {
    const toolIds = pciComplianceAutonomousSkill.getRegistryTools!() as string[];

    it('exposes the 4-tool autonomous bundle plus the 2 platform ES|QL helpers', () => {
      expect(toolIds).toEqual(
        expect.arrayContaining([...PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS])
      );
      expect(toolIds).toContain(PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID);
      expect(toolIds).toContain(PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID);
      expect(toolIds).toContain(PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID);
      expect(toolIds).toContain(PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID);
      expect(toolIds).toContain(platformCoreTools.generateEsql);
      expect(toolIds).toContain(platformCoreTools.executeEsql);
    });

    it('does NOT advertise any hand-written PCI tool IDs (skill+tool isolation property)', () => {
      expect(toolIds).not.toContain(PCI_COMPLIANCE_TOOL_ID);
      expect(toolIds).not.toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
      expect(toolIds).not.toContain(PCI_FIELD_MAPPER_TOOL_ID);
    });

    it('matches the architect-blueprint 4-PCI + 2-platform = 6-tool registry', () => {
      expect(toolIds).toEqual([
        PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID,
        PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID,
        PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID,
        PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID,
        platformCoreTools.generateEsql,
        platformCoreTools.executeEsql,
      ]);
    });

    it('has no duplicate entries', () => {
      expect(new Set(toolIds).size).toBe(toolIds.length);
    });
  });

  /**
   * Anti-overfit invariants.
   *
   * The PCI eval suite (`@kbn/evals-suite-pci-compliance`) seeds Elasticsearch
   * with deterministic fixture data (`pci_data.ts`) so the judge can score the
   * agent's findings against known evidence. The danger when iterating on
   * skill content is to drift from "teach the principle" to "match the
   * fixture" — encoding the fixture's specific values directly into the skill
   * (e.g. `jdoe`, `192.168.1.100`) inflates eval scores without improving
   * real-world behaviour. These tests fail when the skill content carries
   * fixture-specific strings that have no PCI-domain meaning on their own.
   *
   * The list is curated, not exhaustive — it covers values that are present
   * in the iteration dataset **and** have zero standalone PCI meaning:
   *
   *  - `jdoe` — the synthetic brute-force user
   *  - `pcompton` / `service_acct_42` — synthetic user names reserved for the
   *    holdout suite (must not leak from there back into the skill either)
   *  - RFC 5737 documentation IP prefixes used in fixtures
   *  - The exact failed-login count from the iteration fixture
   *
   * Values that ARE legitimate PCI domain concepts (e.g. `admin` and `root`
   * for req 2.2.4, the lockout threshold of `10` for req 8.3.4, `TLS 1.0` /
   * `TLS 1.1` for req 4.1) are explicitly **not** banned — they belong in
   * the skill.
   */
  describe('anti-overfit — skill must not memorize iteration fixtures', () => {
    const FORBIDDEN_FIXTURE_STRINGS = [
      // Iteration-set synthetic user names.
      'jdoe',
      // Holdout-set synthetic user names — banned pre-emptively so a future
      // architect pass that peeks at the holdout cannot leak the values back
      // into the skill content. The holdout's whole purpose is to remain
      // unseen by skill iteration.
      'pcompton',
      'service_acct_42',
      // Iteration-set source IP (RFC 1918 private).
      '192.168.1.100',
      // Iteration-set destination IPs (RFC 5737 TEST-NET-3 / TEST-NET-1).
      '203.0.113.51',
      '203.0.113.52',
      '198.51.100.10',
      // Holdout-set IPs.
      '10.20.30.40',
      // Exact failed-login counts present only as fixture artefacts — the
      // *threshold* of 10 IS domain knowledge (PCI 8.3.4) and is allowed.
      '12 failed',
      '12 attempts',
    ];

    it.each(FORBIDDEN_FIXTURE_STRINGS)(
      'does not embed the fixture value %p (would indicate overfitting to pci_data.ts)',
      (forbidden) => {
        expect(pciComplianceAutonomousSkill.content).not.toContain(forbidden);
        expect(pciComplianceAutonomousSkill.description).not.toContain(forbidden);
      }
    );

    it('does not pin a specific random index name (the eval suite randomises prefixes per run)', () => {
      // The eval suite generates indices like `logs-a7f3b2-auth`. If the skill
      // content embeds a concrete `logs-<somehex>-*` example it has been
      // copy-pasted from a specific run and the skill will fail on the next
      // run's prefix.
      expect(pciComplianceAutonomousSkill.content).not.toMatch(/logs-[a-f0-9]{4,8}-(auth|network|vuln|endpoint|custom)/);
    });
  });
});
