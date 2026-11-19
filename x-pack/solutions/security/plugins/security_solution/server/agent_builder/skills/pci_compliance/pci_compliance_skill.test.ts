/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { pciComplianceSkill, PCI_COMPLIANCE_SKILL_TOOL_IDS } from './pci_compliance_skill';
import { PCI_COMPLIANCE_TOOL_ID } from '../../tools/pci_compliance_tool';
import { PCI_SCOPE_DISCOVERY_TOOL_ID } from '../../tools/pci_scope_discovery_tool';
import { PCI_FIELD_MAPPER_TOOL_ID } from '../../tools/pci_field_mapper_tool';

/**
 * Skill-level contract tests. The Agent Builder tool-selection guideline caps skills at
 * roughly 5 registry tool references because tool-selection accuracy degrades past that.
 * We assert the cap here rather than relying on a soft guideline.
 */
describe('pciComplianceSkill', () => {
  it('has the correct skill id', () => {
    expect(pciComplianceSkill.id).toBe('pci-compliance');
  });

  it('has a valid basePath under security/compliance', () => {
    expect(pciComplianceSkill.basePath).toBe('skills/security/compliance');
  });

  it('has a non-empty description referencing PCI DSS v4.0.1', () => {
    expect(pciComplianceSkill.description.length).toBeGreaterThan(0);
    expect(pciComplianceSkill.description).toContain('PCI DSS v4.0.1');
  });

  it('references PCI DSS v4.0.1 and key v4.0.1 clarifications in content', () => {
    expect(pciComplianceSkill.content).toContain('v4.0.1');
    expect(pciComplianceSkill.content).toContain('critical-severity only');
    expect(pciComplianceSkill.content).toContain('ALL CDE access');
    expect(pciComplianceSkill.content).toContain('FIDO2');
  });

  it('documents confidence interpretation', () => {
    expect(pciComplianceSkill.content).toContain('GREEN + HIGH confidence');
    expect(pciComplianceSkill.content).toContain('RED + HIGH confidence');
    expect(pciComplianceSkill.content).toContain('NOT_ASSESSABLE');
  });

  it('includes deduplication guidance and the consolidated tool workflow', () => {
    expect(pciComplianceSkill.content).toContain('Deduplication');
    expect(pciComplianceSkill.content).toContain(PCI_COMPLIANCE_TOOL_ID);
    expect(pciComplianceSkill.content).toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
    expect(pciComplianceSkill.content).toContain(PCI_FIELD_MAPPER_TOOL_ID);
  });

  it('documents the scopeClaim provenance record', () => {
    expect(pciComplianceSkill.content).toContain('scopeClaim');
  });

  describe('getRegistryTools', () => {
    const toolIds = pciComplianceSkill.getRegistryTools!() as string[];

    it('exposes the consolidated PCI tool set plus ES|QL generators', () => {
      expect(toolIds).toEqual(expect.arrayContaining([...PCI_COMPLIANCE_SKILL_TOOL_IDS]));
      expect(toolIds).toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
      expect(toolIds).toContain(PCI_COMPLIANCE_TOOL_ID);
      expect(toolIds).toContain(PCI_FIELD_MAPPER_TOOL_ID);
      expect(toolIds).toContain(platformCoreTools.generateEsql);
      expect(toolIds).toContain(platformCoreTools.executeEsql);
    });

    it('does not advertise the deprecated split check/report tool IDs', () => {
      expect(toolIds).not.toContain('security.pci_compliance_check');
      expect(toolIds).not.toContain('security.pci_compliance_report');
    });

    it('stays within the 5 registry tool tool-selection cap', () => {
      expect(toolIds.length).toBeLessThanOrEqual(5);
    });

    it('has no duplicate entries', () => {
      expect(new Set(toolIds).size).toBe(toolIds.length);
    });
  });
});
