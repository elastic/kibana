/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { indexHostsAndAlerts } from './index_data';
import type { IndexedHostsResponse } from './data_loaders/index_endpoint_hosts';
import {
  deleteIndexedEndpointHosts,
  indexEndpointHostDocs,
} from './data_loaders/index_endpoint_hosts';
import {
  startMetadataTransforms,
  stopMetadataTransforms,
  waitForMetadataTransformsReady,
} from './utils/transforms';
import { getEndpointPackageInfo } from './utils/package';

jest.mock('./data_loaders/index_endpoint_hosts');
jest.mock('./utils/transforms');
jest.mock('./utils/package');
jest.mock('./data_loaders/setup_fleet_for_endpoint');
jest.mock('./data_loaders/index_fleet_server');

const packageVersion = '9.0.0';
const client = {} as Client;
const kbnClient = {} as KbnClient;
const logger = {
  info: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const runIndexHostsAndAlerts = (fleet: boolean) =>
  indexHostsAndAlerts(
    client,
    kbnClient,
    'seed',
    1,
    1,
    'metrics-endpoint.metadata-default',
    'metrics-endpoint.policy-default',
    'logs-endpoint.events.process-default',
    'logs-endpoint.alerts-default',
    'logs-endpoint.events.device-default',
    0,
    fleet,
    {},
    undefined,
    true,
    undefined,
    undefined,
    false,
    logger
  );

describe('indexHostsAndAlerts', () => {
  const seedingError = new Error('bulk failed');

  beforeEach(() => {
    jest.mocked(getEndpointPackageInfo).mockResolvedValue({
      version: packageVersion,
    } as Awaited<ReturnType<typeof getEndpointPackageInfo>>);
    jest.mocked(waitForMetadataTransformsReady).mockResolvedValue(undefined);
    jest.mocked(stopMetadataTransforms).mockResolvedValue(undefined);
    jest.mocked(startMetadataTransforms).mockResolvedValue(undefined);
    jest.mocked(indexEndpointHostDocs).mockRejectedValue(seedingError);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('restarts the metadata transforms it stopped when host seeding fails', async () => {
    await expect(runIndexHostsAndAlerts(true)).rejects.toBe(seedingError);

    expect(stopMetadataTransforms).toHaveBeenCalledWith(client, packageVersion);
    expect(startMetadataTransforms).toHaveBeenCalledTimes(1);
    expect(startMetadataTransforms).toHaveBeenCalledWith(client, [], packageVersion);
    expect(jest.mocked(stopMetadataTransforms).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(startMetadataTransforms).mock.invocationCallOrder[0]
    );
  });

  it('does not touch the metadata transforms when fleet is disabled', async () => {
    await expect(runIndexHostsAndAlerts(false)).rejects.toBe(seedingError);

    expect(stopMetadataTransforms).not.toHaveBeenCalled();
    expect(startMetadataTransforms).not.toHaveBeenCalled();
  });

  it('rethrows the seeding error when the transform restart also fails', async () => {
    jest.mocked(startMetadataTransforms).mockRejectedValue(new Error('restart failed'));

    await expect(runIndexHostsAndAlerts(true)).rejects.toBe(seedingError);
    expect(startMetadataTransforms).toHaveBeenCalledWith(client, [], packageVersion);
  });

  it('rolls back the seeded hosts before restarting the transforms when the first restart fails', async () => {
    const restartError = new Error('start failed');
    jest.mocked(indexEndpointHostDocs).mockResolvedValue({
      hosts: [{ agent: { id: 'agent-1' } }],
      agents: [{ agent: { id: 'agent-1' } }],
    } as unknown as IndexedHostsResponse);
    jest.mocked(startMetadataTransforms).mockRejectedValueOnce(restartError);

    await expect(runIndexHostsAndAlerts(true)).rejects.toBe(restartError);

    const { calls, invocationCallOrder } = jest.mocked(startMetadataTransforms).mock;
    expect(calls).toEqual([
      [client, ['agent-1'], packageVersion],
      [client, [], packageVersion],
    ]);
    expect(deleteIndexedEndpointHosts).toHaveBeenCalledTimes(1);
    expect(invocationCallOrder[0]).toBeLessThan(
      jest.mocked(deleteIndexedEndpointHosts).mock.invocationCallOrder[0]
    );
    expect(jest.mocked(deleteIndexedEndpointHosts).mock.invocationCallOrder[0]).toBeLessThan(
      invocationCallOrder[1]
    );
  });
});
