/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CDR_METERING_STATE_INDEX } from '@kbn/cloud-security-posture-common';
import {
  createTransformIfNotExists,
  initializeCspTransforms,
  startTransformIfNotStarted,
} from './create_transforms';
import { latestFindingsTransform } from './latest_findings_transform';
import {
  meteringStateTransform,
  METERING_STATE_INDEX_MAPPINGS,
  METERING_STATE_TRANSFORM_ID,
} from './metering_state_transform';

const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

describe('createTransformIfNotExist', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.resetAllMocks();
  });

  it('expect not to create if already exists', async () => {
    mockEsClient.transform.getTransform.mockResolvedValue({ transforms: [], count: 1 });
    await createTransformIfNotExists(mockEsClient, latestFindingsTransform, logger);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledTimes(0);
  });

  it('expect to create if does not already exist', async () => {
    mockEsClient.transform.getTransform.mockRejectedValue({ statusCode: 404 });
    await createTransformIfNotExists(mockEsClient, latestFindingsTransform, logger);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledWith(latestFindingsTransform);
  });

  it('expect not to create if get error is not 404', async () => {
    mockEsClient.transform.getTransform.mockRejectedValue({ statusCode: 400 });
    await createTransformIfNotExists(mockEsClient, latestFindingsTransform, logger);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledTimes(0);
  });
});

describe('meteringStateTransform', () => {
  it('reads raw findings and writes the state index', () => {
    expect(meteringStateTransform.source.index).toBe(
      'logs-cloud_security_posture.findings-default*'
    );
    expect(meteringStateTransform.dest.index).toBe(CDR_METERING_STATE_INDEX);
  });

  it('groups by resource identity INCLUDING incarnation (name-reuse safe)', () => {
    const keys = Object.keys(meteringStateTransform.pivot!.group_by!);
    expect(keys).toEqual([
      'resource.id',
      'resource.lifecycle.incarnation',
      'resource.sub_type',
      'cloud.account.id',
      'posture_type',
    ]);
  });

  it('uses only script-free aggregations', () => {
    const aggs = meteringStateTransform.pivot!.aggregations!;
    expect(Object.keys(aggs)).toEqual(['first_seen', 'last_seen', 'span_ms', 'latest']);
    expect(JSON.stringify(aggs)).not.toContain('scripted_metric');
  });

  it('is continuous, unattended, and garbage-collected on last_seen', () => {
    expect(meteringStateTransform.sync?.time?.field).toBe('event.ingested');
    expect(meteringStateTransform.settings?.unattended).toBe(true);
    expect(meteringStateTransform.retention_policy).toEqual({
      time: { field: 'last_seen', max_age: '7d' },
    });
  });
});

function getTransformWithState(state: string) {
  return {
    state,
    checkpointing: { last: { checkpoint: 1 } },
    id: '',
    stats: {
      documents_indexed: 0,
      documents_processed: 0,
      exponential_avg_checkpoint_duration_ms: 0,
      exponential_avg_documents_indexed: 0,
      exponential_avg_documents_processed: 0,
      index_failures: 0,
      index_time_in_ms: 0,
      index_total: 0,
      pages_processed: 0,
      processing_time_in_ms: 0,
      processing_total: 0,
      search_failures: 0,
      search_time_in_ms: 0,
      search_total: 0,
      trigger_count: 0,
    },
  };
}

describe('startTransformIfNotStarted', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.resetAllMocks();
  });

  ['stopping', 'started', 'aborting', 'indexing'].forEach((state) =>
    it(`expect not to start if state is ${state}`, async () => {
      mockEsClient.transform.getTransformStats.mockResolvedValue({
        transforms: [getTransformWithState(state)],
        count: 1,
      });
      await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
      expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
      expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
        transform_id: latestFindingsTransform.transform_id,
      });
      expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(0);
    })
  );

  it('expect not to start if transform not found', async () => {
    mockEsClient.transform.getTransformStats.mockResolvedValue({
      transforms: [],
      count: 0,
    });
    await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(0);
  });

  it('expect to start if state is stopped', async () => {
    mockEsClient.transform.getTransformStats.mockResolvedValue({
      transforms: [getTransformWithState('stopped')],
      count: 1,
    });
    await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
  });

  it('expect to attempt restart if state is failed', async () => {
    mockEsClient.transform.getTransformStats.mockResolvedValue({
      transforms: [getTransformWithState('failed')],
      count: 1,
    });
    await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
  });
});

describe('initializeCspTransforms metering state index', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  // Transforms are absent, so each one reaches putTransform; the freshly created
  // transform reports as started so no start is attempted.
  const mockTransformsAsAbsentAndStarted = () => {
    mockEsClient.transform.getTransform.mockRejectedValue({ statusCode: 404 });
    mockEsClient.transform.getTransformStats.mockResolvedValue({
      transforms: [getTransformWithState('started')],
      count: 1,
    });
  };

  const wasMeteringTransformRegistered = () =>
    mockEsClient.transform.putTransform.mock.calls.some(
      ([transform]) => transform?.transform_id === METERING_STATE_TRANSFORM_ID
    );

  // Errors as the ES client surfaces them, since transformError reads body.error.
  const esError = (statusCode: number, type: string, reason: string) => ({
    statusCode,
    body: { error: { type, reason } },
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.resetAllMocks();
    mockTransformsAsAbsentAndStarted();
  });

  // `true` marks the findings index as package-managed, skipping that transform
  // so only the vulnerabilities and metering transforms are initialized.
  const initialize = () => initializeCspTransforms(mockEsClient, true, logger);

  it('creates the state index with explicit mappings when it does not exist', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);

    await initialize();

    expect(mockEsClient.indices.create).toHaveBeenCalledTimes(1);
    expect(mockEsClient.indices.create).toHaveBeenCalledWith({
      index: CDR_METERING_STATE_INDEX,
      mappings: METERING_STATE_INDEX_MAPPINGS,
    });
    expect(wasMeteringTransformRegistered()).toBe(true);
  });

  it('does not re-create the state index when it already exists', async () => {
    mockEsClient.indices.exists.mockResolvedValue(true);

    await initialize();

    expect(mockEsClient.indices.create).toHaveBeenCalledTimes(0);
    expect(wasMeteringTransformRegistered()).toBe(true);
  });

  it('registers the transform when a concurrent node created the index first', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);
    mockEsClient.indices.create.mockRejectedValue(
      esError(400, 'resource_already_exists_exception', 'index already exists')
    );

    await initialize();

    expect(wasMeteringTransformRegistered()).toBe(true);
  });

  it('does not register the transform when the state index cannot be created', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);
    mockEsClient.indices.create.mockRejectedValue(
      esError(403, 'security_exception', 'action [indices:admin/create] is unauthorized')
    );

    await initialize();

    expect(wasMeteringTransformRegistered()).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create metering state index')
    );
  });
});
