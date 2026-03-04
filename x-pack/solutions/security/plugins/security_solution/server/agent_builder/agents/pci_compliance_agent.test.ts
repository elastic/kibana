/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { PCI_COMPLIANCE_AGENT_ID } from '../../../common/constants';
import { createPciComplianceAgent, PCI_COMPLIANCE_AGENT_TOOL_IDS } from './pci_compliance_agent';

describe('createPciComplianceAgent', () => {
  it('returns expected agent definition shape', () => {
    const core = coreMock.createSetup();
    const logger = loggingSystemMock.createLogger();
    const agent = createPciComplianceAgent(
      core as unknown as SecuritySolutionPluginCoreSetupDependencies,
      logger
    );

    expect(agent.id).toBe(PCI_COMPLIANCE_AGENT_ID);
    expect(agent.name).toBe('PCI Compliance Agent');
    expect(agent.configuration.tools[0].tool_ids).toEqual(PCI_COMPLIANCE_AGENT_TOOL_IDS);
    expect(agent.labels).toEqual(expect.arrayContaining(['security', 'compliance']));
  });
});
