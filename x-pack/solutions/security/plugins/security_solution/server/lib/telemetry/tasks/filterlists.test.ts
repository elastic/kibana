/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryFilterListArtifactTaskConfig } from './filterlists';
import {
  createMockTelemetryEventsSender,
  createMockTelemetryReceiver,
  createMockTaskMetrics,
} from '../__mocks__';
import { artifactService } from '../artifact';
import { filterList } from '../filterlists';
import { detectionAlertsInfluencerAllowlist } from '../filterlists/detection_alerts_influencer_allowlist';

jest.mock('../artifact', () => ({
  artifactService: {
    getArtifact: jest.fn(),
  },
}));

const mockedArtifactService = artifactService as jest.Mocked<typeof artifactService>;

const baseArtifact = {
  endpoint_alerts: {},
  exception_lists: {},
  prebuilt_rules_alerts: {},
};

describe('telemetry filterlist artifact task', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const runTask = async () => {
    const task = createTelemetryFilterListArtifactTaskConfig();
    return task.runTask(
      'test-id',
      logger,
      createMockTelemetryReceiver(),
      createMockTelemetryEventsSender(),
      createMockTaskMetrics(),
      { last: undefined, current: new Date().toISOString() }
    );
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    filterList.resetAllToDefault();
    jest.clearAllMocks();
  });

  afterAll(() => {
    filterList.resetAllToDefault();
  });

  it('loads a custom detection_alerts_influencer_allowlist from the artifact', async () => {
    const customAllowlist = { 'process.name': true, 'event.module': true };
    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: false,
      data: { ...baseArtifact, detection_alerts_influencer_allowlist: customAllowlist },
    });

    await runTask();

    expect(filterList.detectionAlertsInfluencerAllowlist).toEqual(customAllowlist);
  });

  it('loads an empty detection_alerts_influencer_allowlist', async () => {
    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: false,
      data: { ...baseArtifact, detection_alerts_influencer_allowlist: {} },
    });

    await runTask();

    expect(filterList.detectionAlertsInfluencerAllowlist).toEqual({});
  });

  it('keeps the bundled default when a legacy artifact omits the property', async () => {
    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: false,
      data: { ...baseArtifact },
    });

    await runTask();

    expect(filterList.detectionAlertsInfluencerAllowlist).toEqual(
      detectionAlertsInfluencerAllowlist
    );
  });
});
