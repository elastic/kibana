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

  it('generates basic command without wired streams', () => {
    const command = getAutoDetectCommand(baseParams);

    expect(command).toContain('curl http://localhost:5603/api/auto_detect.sh');
    expect(command).toContain('--id=test-onboarding-id');
    expect(command).toContain('--kibana-url=http://localhost:5603');
    expect(command).toContain('--install-key=install-api-key');
    expect(command).toContain('--ingest-key=ingest-api-key');
    expect(command).toContain('--ea-version=9.1.0');
    expect(command).not.toContain('--write-to-logs-streams');
    expect(command).not.toContain('--metrics-enabled=false');
  });

  it('includes --write-to-logs-streams=true when useWiredStreams is true', () => {
    const command = getAutoDetectCommand({
      ...baseParams,
      useWiredStreams: true,
    });

    expect(command).toContain('--write-to-logs-streams=true');
  });

  it('does NOT include --write-to-logs-streams when useWiredStreams is false', () => {
    const command = getAutoDetectCommand({
      ...baseParams,
      useWiredStreams: false,
    });

    expect(command).not.toContain('--write-to-logs-streams');
  });

  it('does NOT include --write-to-logs-streams when useWiredStreams is undefined', () => {
    const command = getAutoDetectCommand(baseParams);

    expect(command).not.toContain('--write-to-logs-streams');
  });

  it('includes --metrics-enabled=false when metricsEnabled is false', () => {
    const command = getAutoDetectCommand({
      ...baseParams,
      metricsEnabled: false,
    });

    expect(command).toContain('--metrics-enabled=false');
  });

  it('combines wired streams and metrics disabled correctly', () => {
    const command = getAutoDetectCommand({
      ...baseParams,
      metricsEnabled: false,
      useWiredStreams: true,
    });

    expect(command).toContain('--metrics-enabled=false');
    expect(command).toContain('--write-to-logs-streams=true');
  });
});
