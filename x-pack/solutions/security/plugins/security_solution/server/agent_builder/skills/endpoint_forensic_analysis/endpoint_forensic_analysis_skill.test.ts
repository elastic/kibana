/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS,
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';
import { platformCoreTools } from '@kbn/agent-builder-common';

describe('endpointForensicAnalysisSkill', () => {
  it('binds Osquery live-query tools so they are available when the skill loads', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];

    for (const osqueryToolId of ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS) {
      expect(registryTools).toContain(osqueryToolId);
    }

    expect(registryTools).toContain(platformCoreTools.generateEsql);
    expect(registryTools).toContain(platformCoreTools.executeEsql);
    expect(registryTools).toContain('osquery.get_live_query_results');
    expect(registryTools).toContain('osquery.run_live_query');
  });
});
