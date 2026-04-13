/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { pciComplianceSkill } from './pci_compliance_skill';
import { PCI_COMPLIANCE_CHECK_TOOL_ID } from '../../tools/pci_compliance_check_tool';
import { PCI_COMPLIANCE_REPORT_TOOL_ID } from '../../tools/pci_compliance_report_tool';
import { PCI_SCOPE_DISCOVERY_TOOL_ID } from '../../tools/pci_scope_discovery_tool';
import { PCI_FIELD_MAPPER_TOOL_ID } from '../../tools/pci_field_mapper_tool';

describe('pciComplianceSkill', () => {
  it('has the correct skill id', () => {
    expect(pciComplianceSkill.id).toBe('pci-compliance');
  });

  it('has a valid basePath under security/compliance', () => {
    expect(pciComplianceSkill.basePath).toBe('skills/security/compliance');
  });

  it('has a non-empty description', () => {
    expect(pciComplianceSkill.description.length).toBeGreaterThan(0);
    expect(pciComplianceSkill.description).toContain('PCI DSS v4.0.1');
  });

  it('has non-empty content with instructions', () => {
    expect(pciComplianceSkill.content.length).toBeGreaterThan(0);
  });

  it('references PCI DSS v4.0.1 in content', () => {
    expect(pciComplianceSkill.content).toContain('v4.0.1');
  });

  it('includes compliance workflow guidance', () => {
    expect(pciComplianceSkill.content).toContain('Compliance Assessment Workflow');
  });

  it('includes confidence interpretation guidance', () => {
    expect(pciComplianceSkill.content).toContain('GREEN + HIGH confidence');
    expect(pciComplianceSkill.content).toContain('RED + HIGH confidence');
    expect(pciComplianceSkill.content).toContain('NOT_ASSESSABLE');
  });

  it('documents v4.0.1 clarifications', () => {
    expect(pciComplianceSkill.content).toContain('critical-severity only');
    expect(pciComplianceSkill.content).toContain('ALL CDE access');
    expect(pciComplianceSkill.content).toContain('FIDO2');
  });

  it('includes deduplication guidance', () => {
    expect(pciComplianceSkill.content).toContain('Deduplication');
  });

  it('includes non-ECS data workflow', () => {
    expect(pciComplianceSkill.content).toContain(PCI_FIELD_MAPPER_TOOL_ID);
  });

  describe('getRegistryTools', () => {
    it('returns all PCI tool IDs', () => {
      const toolIds = pciComplianceSkill.getRegistryTools!();
      expect(toolIds).toContain(PCI_SCOPE_DISCOVERY_TOOL_ID);
      expect(toolIds).toContain(PCI_COMPLIANCE_CHECK_TOOL_ID);
      expect(toolIds).toContain(PCI_COMPLIANCE_REPORT_TOOL_ID);
      expect(toolIds).toContain(PCI_FIELD_MAPPER_TOOL_ID);
    });

    it('returns platform core tools for data exploration', () => {
      const toolIds = pciComplianceSkill.getRegistryTools!();
      expect(toolIds).toContain(platformCoreTools.generateEsql);
      expect(toolIds).toContain(platformCoreTools.executeEsql);
      expect(toolIds).toContain(platformCoreTools.listIndices);
    });

    it('stays within the 25 registry tool limit', () => {
      const toolIds = pciComplianceSkill.getRegistryTools!();
      expect((toolIds as string[]).length).toBeLessThanOrEqual(25);
    });
  });
});
