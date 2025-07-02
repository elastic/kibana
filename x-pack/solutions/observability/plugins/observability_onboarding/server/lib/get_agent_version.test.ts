/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestAgentVersionInRange } from './get_agent_version';

describe('getLatestAgentVersionInRange()', () => {
  it('returns agent version within the specified range', () => {
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
    const fromVersion = '9.0.0';
    const upToVersion = '10.0.0';

    const result = getLatestAgentVersionInRange(
      agentVersionList,
      kibanaVersion,
      fromVersion,
      upToVersion
    );

    expect(result).toBe('9.1.0');
  });

  it('returns the kibana version if there is no compatible agent version', () => {
    const agentVersionList = ['10.0.0', '9.1.0', '9.0.1', '9.0.0'];
    const kibanaVersion = '8.18.0';
    const fromVersion = '8.0.0';
    const upToVersion = '9.0.0';

    const result = getLatestAgentVersionInRange(
      agentVersionList,
      kibanaVersion,
      fromVersion,
      upToVersion
    );

    expect(result).toBe('8.18.0');
  });
});
