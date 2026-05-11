/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomous PCI compliance tool bundle — fully-autonomous v6.
 *
 * Per the autonomous architect's blueprint, the `pci-compliance-autonomous` skill
 * operates over an independent set of 4 tools (vs the hand-written variant's 3-tool
 * consolidated layout):
 *
 *   1. pci_autonomous_scope_discovery
 *   2. pci_autonomous_compliance_check
 *   3. pci_autonomous_scorecard_report
 *   4. pci_autonomous_field_mapper
 *
 * v6 update: the agent-facing surface AND the underlying domain engine are now
 * independently authored. The engine modules
 *
 *   - pci_autonomous_requirements.ts   (PCI DSS v4.0.1 catalog, ESQL templates, helpers)
 *   - pci_autonomous_evaluator.ts      (composable pipeline, lookup-table scoring)
 *   - pci_autonomous_schemas.ts        (zod schemas, ScopeClaim with provenance block)
 *
 * have zero imports from the hand-written sibling's `pci_compliance_*` modules. The CI
 * test `pci_autonomous_modules_no_handwritten_imports.test.ts` locks this in. See
 * comparison.html §1.5 for the per-layer autonomy ladder.
 *
 * Registration is gated separately from the hand-written variant — see
 * agent_builder/tools/register_tools.ts. The autonomous skill never sees the hand-
 * written tool IDs, so the validation is a true skill+tool+engine autonomous-stack
 * experiment.
 */

export {
  pciAutonomousScopeDiscoveryTool,
  PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID,
} from './pci_autonomous_scope_discovery_tool';
export {
  pciAutonomousComplianceCheckTool,
  PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID,
} from './pci_autonomous_compliance_check_tool';
export {
  pciAutonomousScorecardReportTool,
  PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID,
} from './pci_autonomous_scorecard_report_tool';
export {
  pciAutonomousFieldMapperTool,
  PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID,
} from './pci_autonomous_field_mapper_tool';
