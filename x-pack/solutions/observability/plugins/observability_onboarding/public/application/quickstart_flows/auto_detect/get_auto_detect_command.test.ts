/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAutoDetectCommand } from './get_auto_detect_command';

describe('getAutoDetectCommand', () => {
  const baseParams = {
    scriptDownloadUrl: 'http://localhost:5603/api/auto_detect.sh',
    onboardingId: 'test-onboarding-id',
    kibanaUrl: 'http://localhost:5603',
    installApiKey: 'install-api-key',
    ingestApiKey: 'ingest-api-key',
    elasticAgentVersion: '9.1.0',
    metricsEnabled: true,
  };

  it('generates a basic command', () => {
    const command = getAutoDetectCommand(baseParams);

    expect(command).toContain('curl http://localhost:5603/api/auto_detect.sh');
    expect(command).toContain('--id=test-onboarding-id');
    expect(command).toContain('--kibana-url=http://localhost:5603');
    expect(command).toContain('--install-key=install-api-key');
    expect(command).toContain('--ingest-key=ingest-api-key');
    expect(command).toContain('--ea-version=9.1.0');
    expect(command).not.toContain('--write-to-logs-stream');
    expect(command).not.toContain('--metrics-enabled=false');
  });

  it('includes --metrics-enabled=false when metricsEnabled is false', () => {
    const command = getAutoDetectCommand({
      ...baseParams,
      metricsEnabled: false,
    });

    expect(command).toContain('--metrics-enabled=false');
  });
});
