/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { restoreAlertsSnapshot } from './restore';
import type { AlertsSnapshotConfig } from './config';

const mockRestoreSnapshot = jest.fn();

jest.mock('@kbn/es-snapshot-loader', () => ({
  createGcsRepository: jest.fn(() => ({ type: 'gcs' })),
  restoreSnapshot: (...args: unknown[]) => mockRestoreSnapshot(...args),
}));

const config: AlertsSnapshotConfig = { bucket: 'bucket', basePath: 'base/path' };

const DUAL_WRITE_INDEX_ERROR =
  'illegal_state_exception: alias [.alerts-security.alerts-default] has more than one write index [.internal.alerts-security.alerts-default-000001,.internal.alerts-security.alerts-default-000002]';
const OPEN_INDEX_ERROR =
  'snapshot_restore_exception: cannot restore index [x] because an open index with same name already exists in the cluster';

const failed = (error: string) => ({
  success: false,
  snapshotName: 'snap',
  restoredIndices: [],
  errors: [error],
});
const succeeded = {
  success: true,
  snapshotName: 'snap',
  restoredIndices: ['.internal.alerts-security.alerts-default-000001'],
  errors: [],
};

const createEsClient = () => {
  const indices = {
    get: jest.fn().mockResolvedValue({ '.internal.alerts-security.alerts-default-000001': {} }),
    delete: jest.fn().mockResolvedValue({ acknowledged: true }),
    refresh: jest.fn().mockResolvedValue({}),
  };
  return { esClient: { indices } as unknown as Client, indices };
};

describe('restoreAlertsSnapshot', () => {
  const log = new ToolingLog();

  beforeEach(() => {
    mockRestoreSnapshot.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const run = async (esClient: Client) => {
    const promise = restoreAlertsSnapshot({ esClient, log, config });
    const settled = promise.then(
      () => undefined,
      (err: Error) => err
    );
    await jest.runAllTimersAsync();
    return settled;
  };

  it.each([
    ['more than one write index', DUAL_WRITE_INDEX_ERROR],
    ['open index with the same name', OPEN_INDEX_ERROR],
  ])('deletes and retries once when restore fails with %s', async (_label, error) => {
    mockRestoreSnapshot.mockResolvedValueOnce(failed(error)).mockResolvedValueOnce(succeeded);
    const { esClient, indices } = createEsClient();

    await expect(run(esClient)).resolves.toBeUndefined();

    expect(mockRestoreSnapshot).toHaveBeenCalledTimes(2);
    // one de-duplicated delete before the first restore, one before the retry
    expect(indices.delete).toHaveBeenCalledTimes(2);
    expect(indices.refresh).toHaveBeenCalledWith({ index: '_all' });
  });

  it('does not retry on unrelated restore errors', async () => {
    mockRestoreSnapshot.mockResolvedValueOnce(failed('repository_missing_exception: [repo]'));
    const { esClient } = createEsClient();

    const err = await run(esClient);

    expect(err).toEqual(new Error('Snapshot restore failed: repository_missing_exception: [repo]'));
    expect(mockRestoreSnapshot).toHaveBeenCalledTimes(1);
  });

  it('fails after a single retry when the conflict persists', async () => {
    mockRestoreSnapshot.mockResolvedValue(failed(DUAL_WRITE_INDEX_ERROR));
    const { esClient } = createEsClient();

    const err = await run(esClient);

    expect(err).toEqual(new Error(`Snapshot restore failed: ${DUAL_WRITE_INDEX_ERROR}`));
    expect(mockRestoreSnapshot).toHaveBeenCalledTimes(2);
  });
});
