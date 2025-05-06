/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestAgentVersionForPattern } from './get_agent_version';

describe('getLatestAgentVersionInRange()', () => {
  it('returns the latest agent version that matches the provided version pattern', () => {
    const agentVersionList = [
      '10.0.0',
      '9.1.0',
      '9.0.1',
      '9.0.0',
      '8.18.1',
      '8.18.0',
      '8.17.1',
      '8.17.0',
    ];
    const kibanaVersion = '8.18.0';
    const versionPattern = '9.x.x';

    const result = getLatestAgentVersionForPattern(agentVersionList, kibanaVersion, versionPattern);

    expect(result).toBe('9.1.0');
  });

  it('returns the kibana version if there is no agent version matching the provided version pattern', () => {
    const agentVersionList = ['10.0.0', '9.1.0', '9.0.1', '9.0.0'];
    const kibanaVersion = '8.18.0';
    const versionPattern = '8.x.x';

    const result = getLatestAgentVersionForPattern(agentVersionList, kibanaVersion, versionPattern);

    expect(result).toBe('8.18.0');
  });
});
