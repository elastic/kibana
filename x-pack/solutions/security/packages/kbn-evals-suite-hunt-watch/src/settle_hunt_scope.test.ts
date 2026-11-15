/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { readFileSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { FLEET_AGENT_STATUS_CHANGE_STREAM, settleHuntScope } from './seed_hunt_data';

const esError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { meta: { statusCode } });

const buildClient = (createDataStream: jest.Mock) =>
  ({
    indices: { createDataStream },
    cluster: { health: jest.fn().mockResolvedValue({ status: 'yellow' }) },
  } as unknown as Client);

describe('settleHuntScope', () => {
  const log = new ToolingLog();

  it("matches Fleet's agent status change data stream name", () => {
    const fleetConstants = readFileSync(
      Path.join(REPO_ROOT, 'x-pack/platform/plugins/shared/fleet/common/constants/agent.ts'),
      'utf8'
    );
    expect(fleetConstants).toContain("dataset: 'elastic_agent.status_change'");
    expect(FLEET_AGENT_STATUS_CHANGE_STREAM).toBe('logs-elastic_agent.status_change-default');
  });

  it('creates the Fleet status change stream before any hunt runs', async () => {
    const createDataStream = jest.fn().mockResolvedValue({ acknowledged: true });
    await settleHuntScope({ esClient: buildClient(createDataStream), log });
    expect(createDataStream).toHaveBeenCalledWith({ name: FLEET_AGENT_STATUS_CHANGE_STREAM });
  });

  it('returns normally when the stream already exists', async () => {
    const createDataStream = jest
      .fn()
      .mockRejectedValue(esError(400, 'resource_already_exists_exception: data stream exists'));
    await expect(
      settleHuntScope({ esClient: buildClient(createDataStream), log })
    ).resolves.toBeUndefined();
  });

  it('rethrows any other Elasticsearch error', async () => {
    const createDataStream = jest.fn().mockRejectedValue(esError(403, 'security_exception'));
    await expect(settleHuntScope({ esClient: buildClient(createDataStream), log })).rejects.toThrow(
      'security_exception'
    );
  });

  it('waits for every logs-* shard to finish initializing', async () => {
    const esClient = buildClient(jest.fn().mockResolvedValue({ acknowledged: true }));
    await settleHuntScope({ esClient, log });
    expect(esClient.cluster.health).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-*', wait_for_no_initializing_shards: true })
    );
  });
});
