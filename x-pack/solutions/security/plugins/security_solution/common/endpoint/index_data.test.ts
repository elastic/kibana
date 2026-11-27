/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { indexHostsAndAlerts } from './index_data';
import { indexEndpointHostDocs } from './data_loaders/index_endpoint_hosts';
import { enableFleetServerIfNecessary } from './data_loaders/index_fleet_server';
import { setupFleetForEndpoint } from './data_loaders/setup_fleet_for_endpoint';
import {
  startMetadataTransforms,
  stopMetadataTransforms,
  waitForMetadataTransformsReady,
} from './utils/transforms';
import { getEndpointPackageInfo } from './utils/package';

jest.mock('./data_loaders/usage_tracker', () => ({
  usageTracker: { track: (_name: string, fn: unknown) => fn },
}));
jest.mock('./data_loaders/index_endpoint_hosts');
jest.mock('./data_loaders/index_fleet_server');
jest.mock('./data_loaders/index_alerts');
jest.mock('./data_loaders/index_device_events');
jest.mock('./data_loaders/setup_fleet_for_endpoint');
jest.mock('./utils/transforms');
jest.mock('./utils/package');

describe('indexHostsAndAlerts()', () => {
  const client = {} as Client;
  const kbnClient = {} as KbnClient;

  const callIndexHostsAndAlerts = (fleet: boolean, waitUntilTransformed?: boolean) =>
    indexHostsAndAlerts(
      client,
      kbnClient,
      'seed',
      1,
      1,
      'metadata-index',
      'policy-response-index',
      'event-index',
      'alert-index',
      'device-index',
      0,
      fleet,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      waitUntilTransformed
    );

  beforeEach(() => {
    jest.mocked(getEndpointPackageInfo).mockResolvedValue({ version: '9.5.0' } as never);
    jest.mocked(setupFleetForEndpoint).mockResolvedValue(undefined as never);
    jest.mocked(enableFleetServerIfNecessary).mockResolvedValue(undefined as never);
    jest.mocked(waitForMetadataTransformsReady).mockResolvedValue(undefined as never);
    jest.mocked(stopMetadataTransforms).mockResolvedValue(undefined as never);
    jest.mocked(startMetadataTransforms).mockResolvedValue(undefined as never);
    jest.mocked(indexEndpointHostDocs).mockResolvedValue({
      hosts: [],
      agents: [{ agent: { id: 'agent-1' } }],
    } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('leaves the metadata transforms untouched when `waitUntilTransformed` is false', async () => {
    await callIndexHostsAndAlerts(true, false);

    expect(indexEndpointHostDocs).toHaveBeenCalledTimes(1);
    expect(waitForMetadataTransformsReady).not.toHaveBeenCalled();
    expect(stopMetadataTransforms).not.toHaveBeenCalled();
    expect(startMetadataTransforms).not.toHaveBeenCalled();
  });

  it.each([
    ['omitted', undefined],
    ['true', true],
  ])(
    'waits for, stops and restarts the metadata transforms when `waitUntilTransformed` is %s',
    async (_label, waitUntilTransformed) => {
      await callIndexHostsAndAlerts(true, waitUntilTransformed);

      expect(waitForMetadataTransformsReady).toHaveBeenCalledWith(client, '9.5.0');
      expect(stopMetadataTransforms).toHaveBeenCalledWith(client, '9.5.0');
      expect(startMetadataTransforms).toHaveBeenCalledWith(client, ['agent-1'], '9.5.0');
    }
  );

  it('does not touch the metadata transforms without fleet, regardless of the flag', async () => {
    await callIndexHostsAndAlerts(false);

    expect(waitForMetadataTransformsReady).not.toHaveBeenCalled();
    expect(stopMetadataTransforms).not.toHaveBeenCalled();
    expect(startMetadataTransforms).not.toHaveBeenCalled();
  });
});
