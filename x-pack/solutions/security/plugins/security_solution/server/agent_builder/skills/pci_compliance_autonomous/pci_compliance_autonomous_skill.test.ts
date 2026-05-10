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
import { PCI_COMPLIANCE_TOOL_ID } from '../../tools/pci_compliance_tool';
import { PCI_SCOPE_DISCOVERY_TOOL_ID } from '../../tools/pci_scope_discovery_tool';
import { PCI_FIELD_MAPPER_TOOL_ID } from '../../tools/pci_field_mapper_tool';

/**
 * Contract tests for the autonomously-architected variant. The test surface mirrors the
 * hand-written sister skill's tests so the side-by-side eval comparison stays apples-to-apples
 * on infrastructure assertions; on top of that we lock in the autonomous skill's distinguishing
 * domain-knowledge content (SAQ taxonomy, v3→v4 deltas, scope-reduction levers, technical-vs-
 * process classification) that came from the autonomous architect's model-knowledge pass.
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
      expect(pciComplianceAutonomousSkill.content).toContain('Technical');
      expect(pciComplianceAutonomousSkill.content).toContain('Process-based');
      expect(pciComplianceAutonomousSkill.content).toContain('human attestation');
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

    it('includes deduplication guidance and the consolidated tool workflow', () => {
      expect(pciComplianceAutonomousSkill.content).toContain('Deduplication');
      expect(pciComplianceAutonomousSkill.content).toContain(PCI_COMPLIANCE_TOOL_ID);
      expect(pciComplianceAutonomousSkill.content).toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
      expect(pciComplianceAutonomousSkill.content).toContain(PCI_FIELD_MAPPER_TOOL_ID);
    });
  });

  describe('getRegistryTools', () => {
    const toolIds = pciComplianceAutonomousSkill.getRegistryTools!() as string[];

    it('exposes the consolidated PCI tool set plus ES|QL generators', () => {
      expect(toolIds).toEqual(
        expect.arrayContaining([...PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS])
      );
      expect(toolIds).toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
      expect(toolIds).toContain(PCI_COMPLIANCE_TOOL_ID);
      expect(toolIds).toContain(PCI_FIELD_MAPPER_TOOL_ID);
      expect(toolIds).toContain(platformCoreTools.generateEsql);
      expect(toolIds).toContain(platformCoreTools.executeEsql);
    });

    it('stays within the 5 registry tool selection cap', () => {
      expect(toolIds.length).toBeLessThanOrEqual(5);
    });

    it('has no duplicate entries', () => {
      expect(new Set(toolIds).size).toBe(toolIds.length);
    });

    it('uses identical tool ids to the hand-written variant — isolating skill content as the only variable', () => {
      expect(toolIds).toEqual([
        PCI_SCOPE_DISCOVERY_TOOL_ID,
        PCI_COMPLIANCE_TOOL_ID,
        PCI_FIELD_MAPPER_TOOL_ID,
        platformCoreTools.generateEsql,
        platformCoreTools.executeEsql,
      ]);
    });
  });
});
