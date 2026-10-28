/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
  ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
} from './endpoint_forensic_tool_ids';

// Pins the mirrored contract to the securityTool() names registered by
// endpoint_forensic_analysis_skill.ts.
describe('endpoint forensic tool id contract', () => {
  it('mirrors the security-namespaced ids registered by the skill', () => {
    expect(ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID).toBe(
      'security.endpoint_forensic.discover_telemetry'
    );
    expect(ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID).toBe('security.endpoint_forensic.extract_iocs');
  });
});
