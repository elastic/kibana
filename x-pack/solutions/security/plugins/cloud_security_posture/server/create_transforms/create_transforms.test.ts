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
import {
  METERING_STATE_INDEX_PATTERN,
  METERING_STATE_INDEX_TEMPLATE_NAME,
} from '../../common/constants';

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

  it('uses only per-bucket aggregations, never a per-document script', () => {
    const aggs = meteringStateTransform.pivot!.aggregations!;
    expect(Object.keys(aggs)).toEqual([
      'first_seen',
      'last_seen',
      'span_ms',
      'last_started_at',
      'last_stopped_at',
      'last_run_ms',
    ]);
    expect(JSON.stringify(aggs)).not.toContain('scripted_metric');
    expect(JSON.stringify(aggs)).not.toContain('runtime_mappings');
  });

  it('carries no top_metrics: it cannot express a missing metric', () => {
    // top_metrics emits the string "null" for a metric absent from the bucket,
    // which a date/long mapping rejects, dropping the whole state document.
    // Regression guard for the outage that fix restored: every non-GCP
    // resource and every never-stopped GCP instance produced no state doc.
    expect(JSON.stringify(meteringStateTransform.pivot!.aggregations!)).not.toContain(
      'top_metrics'
    );
  });

  it('derives last_run_ms from sibling aggs reachable by buckets_path', () => {
    const aggs = meteringStateTransform.pivot!.aggregations!;
    // buckets_path parses dots as a metric sub-path, so these references only
    // resolve while the sibling aggs keep flat, dot-free names.
    expect(aggs.last_run_ms.bucket_script?.buckets_path).toEqual({
      start: 'last_started_at',
      stop: 'last_stopped_at',
    });
    expect(Object.keys(aggs)).toEqual(
      expect.arrayContaining(['last_started_at', 'last_stopped_at'])
    );
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

  it('is named so the kibana service account can read it', () => {
    // elastic/kibana holds `read` on `logs-*.*`, which covers this name. Under
    // `security_solution-*` the metering task's own query is denied with a 403
    // that the freshness probe swallows, silently pinning CSPM to legacy
    // billing forever. Verified against a real cluster: logs- name 200,
    // security_solution- name 403.
    expect(CDR_METERING_STATE_INDEX.startsWith('logs-')).toBe(true);
  });

  it('upserts the index template before creating the index', async () => {
    // A plain index under logs-*-* is rejected unless a non-data-stream template
    // outranks the built-in `logs` template, so the template must come first.
    mockEsClient.indices.exists.mockResolvedValue(false);

    await initialize();

    expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: METERING_STATE_INDEX_TEMPLATE_NAME,
        index_patterns: METERING_STATE_INDEX_PATTERN,
        priority: 500,
        template: { mappings: METERING_STATE_INDEX_MAPPINGS },
      })
    );
    expect(mockEsClient.indices.putIndexTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      mockEsClient.indices.create.mock.invocationCallOrder[0]
    );
  });

  it('keeps the template up to date even when the index already exists', async () => {
    mockEsClient.indices.exists.mockResolvedValue(true);

    await initialize();

    expect(mockEsClient.indices.create).toHaveBeenCalledTimes(0);
    expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
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
