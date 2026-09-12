/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';

const chance = new Chance();

// see https://github.com/elastic/security-team/issues/8970 for billable asset definition
export const BILLABLE_ASSETS_CONFIG = {
  cspm: [
    // 'aws-ebs', we can't include EBS volumes until https://github.com/elastic/security-team/issues/9283 is resolved
    // 'aws-ec2', we can't include EC2 instances until https://github.com/elastic/security-team/issues/9254 is resolved
    'aws-s3',
    'aws-rds',
    'azure-disk',
    'azure-document-db-database-account',
    'azure-flexible-mysql-server-db',
    'azure-flexible-postgresql-server-db',
    'azure-mysql-server-db',
    'azure-postgresql-server-db',
    'azure-sql-server',
    'azure-storage-account',
    'azure-vm',
    'gcp-bigquery-dataset',
    'gcp-compute-disk',
    'gcp-compute-instance',
    'gcp-sqladmin-instance',
    'gcp-storage-bucket',
  ],
  kspm: ['Node', 'node'],
};
export const getMockFindings = ({
  postureType,
  isBillableAsset,
  numberOfFindings,
}: {
  postureType: string;
  isBillableAsset?: boolean;
  numberOfFindings: number;
}) => {
  return Array.from({ length: numberOfFindings }, () => mockFiniding(postureType, isBillableAsset));
};

const mockFiniding = (postureType: string, isBillableAsset?: boolean) => {
  if (postureType === 'cspm') {
    const randomAsset = isBillableAsset
      ? chance.pickone(BILLABLE_ASSETS_CONFIG.cspm)
      : 'not-billable-asset';
    return {
      resource: { id: chance.guid(), sub_type: randomAsset },
      rule: {
        benchmark: {
          posture_type: 'cspm',
        },
      },
    };
  }
  if (postureType === 'kspm') {
    const randomAsset = isBillableAsset
      ? chance.pickone(BILLABLE_ASSETS_CONFIG.kspm)
      : 'not-billable-asset';

    return {
      resource: { id: chance.guid(), sub_type: randomAsset },
      rule: {
        benchmark: {
          posture_type: 'kspm',
        },
      },
      agent: { id: chance.guid() },
    };
  }
  if (postureType === 'cnvm') {
    return {
      cloud: {
        instance: {
          id: chance.guid(),
        },
      },
    };
  }

  throw new Error('Invalid posture type');
};

const HOUR_MS = 60 * 60 * 1000;

// `now` is always passed in rather than read per call: the span_ms === 0 case
// depends on first_seen and last_seen being byte-identical, and two Date.now()
// reads a millisecond apart would silently make a single-scan resource look
// corroborated.
const hoursAgoIso = (now: number, hours: number) => new Date(now - hours * HOUR_MS).toISOString();

export const GCP_COMPUTE_INSTANCE_SUB_TYPE = 'gcp-compute-instance';

/**
 * One document shaped exactly like the metering_state transform's output, per
 * METERING_STATE_INDEX_MAPPINGS in
 * cloud_security_posture/server/create_transforms/metering_state_transform.ts:
 * flat top-level lifecycle fields, no status, no `latest` wrapper.
 *
 * `span_ms` is derived here the same way the transform's bucket_script derives
 * it (last_seen - first_seen), so equal first/last seen values produce the
 * span_ms === 0 "seen on a single scan" state.
 *
 * Lifecycle knobs mirror what the transform can actually emit, so the three
 * GCP states are expressed by which knobs are set rather than by a status
 * string:
 *   - running, never stopped: lastStartHoursAgo only
 *   - running after restart:  lastStartHoursAgo + lastStopHoursAgo, stop
 *                             OLDER than start -> negative last_run_ms
 *   - stopped:                lastStartHoursAgo + lastStopHoursAgo, stop
 *                             NEWER than start -> positive last_run_ms
 * last_run_ms is always derived from the two, never set independently: the
 * transform computes it as stop - start and cannot disagree with them.
 */
export const getMockMeteringStateDoc = ({
  subType,
  firstSeenHoursAgo,
  lastSeenHoursAgo,
  lastStartHoursAgo,
  lastStopHoursAgo,
  postureType = 'cspm',
  resourceId = chance.guid(),
  accountId = chance.guid(),
  incarnation = null,
}: {
  subType: string;
  firstSeenHoursAgo: number;
  lastSeenHoursAgo: number;
  lastStartHoursAgo?: number;
  lastStopHoursAgo?: number;
  postureType?: string;
  resourceId?: string;
  accountId?: string;
  incarnation?: string | null;
}) => {
  const now = Date.now();
  const firstSeen = now - firstSeenHoursAgo * HOUR_MS;
  const lastSeen = now - lastSeenHoursAgo * HOUR_MS;
  const lastStartedAt =
    lastStartHoursAgo !== undefined ? now - lastStartHoursAgo * HOUR_MS : undefined;
  const lastStoppedAt =
    lastStopHoursAgo !== undefined ? now - lastStopHoursAgo * HOUR_MS : undefined;

  return {
    resource: {
      id: resourceId,
      sub_type: subType,
      lifecycle: { incarnation },
    },
    cloud: { account: { id: accountId } },
    posture_type: postureType,
    first_seen: new Date(firstSeen).toISOString(),
    last_seen: new Date(lastSeen).toISOString(),
    span_ms: lastSeen - firstSeen,
    ...(lastStartedAt !== undefined
      ? { last_started_at: new Date(lastStartedAt).toISOString() }
      : {}),
    ...(lastStoppedAt !== undefined
      ? { last_stopped_at: new Date(lastStoppedAt).toISOString() }
      : {}),
    ...(lastStartedAt !== undefined && lastStoppedAt !== undefined
      ? { last_run_ms: lastStoppedAt - lastStartedAt }
      : {}),
  };
};

/**
 * A raw findings document as the cloud_security_posture package ingest
 * pipeline (>= 3.6.0) emits it — the pipeline lifts resource.raw lifecycle
 * data into indexed resource.lifecycle.* fields. That pipeline is not present
 * in this FTR environment, so these fields are written directly to simulate
 * its output; the metering_state transform then reads them unchanged.
 *
 * `event.ingested` is always NOW, never backdated: the transform's continuous
 * sync is `{ time: { field: 'event.ingested', delay: '60s' } }`, so a document
 * ingested outside the current checkpoint range would never be picked up. The
 * backdated scan time belongs on `@timestamp`, which is what the transform's
 * first_seen/last_seen aggregations read.
 */
export const getMockRawLifecycleFinding = ({
  resourceId,
  subType,
  scanHoursAgo,
  incarnation,
  status,
  lastStartHoursAgo,
  lastStopHoursAgo,
  accountId = 'ftr-metering-account',
}: {
  resourceId: string;
  subType: string;
  scanHoursAgo: number;
  incarnation: string;
  status?: string;
  lastStartHoursAgo?: number;
  lastStopHoursAgo?: number;
  accountId?: string;
}) => {
  const now = Date.now();
  const lastStartedAt =
    lastStartHoursAgo !== undefined ? now - lastStartHoursAgo * HOUR_MS : undefined;
  const lastStoppedAt =
    lastStopHoursAgo !== undefined ? now - lastStopHoursAgo * HOUR_MS : undefined;

  return {
    '@timestamp': hoursAgoIso(now, scanHoursAgo),
    event: { ingested: new Date(now).toISOString() },
    resource: {
      id: resourceId,
      sub_type: subType,
      lifecycle: {
        // The incarnation IS the creation timestamp of this physical instance:
        // grouping on it is what keeps a re-created spot VM from inheriting the
        // first_seen of the instance that previously held the same name.
        incarnation,
        created_at: incarnation,
        ...(status !== undefined ? { status } : {}),
        ...(lastStartedAt !== undefined
          ? { last_started_at: new Date(lastStartedAt).toISOString() }
          : {}),
        ...(lastStoppedAt !== undefined
          ? { last_stopped_at: new Date(lastStoppedAt).toISOString() }
          : {}),
        ...(lastStartedAt !== undefined && lastStoppedAt !== undefined
          ? { last_run_ms: lastStoppedAt - lastStartedAt }
          : {}),
      },
    },
    rule: { benchmark: { posture_type: 'cspm' } },
    cloud: { account: { id: accountId } },
  };
};

export const getMockDefendForContainersHeartbeats = ({
  isBlockActionEnables,
  numberOfHearbeats,
}: {
  isBlockActionEnables: boolean;
  numberOfHearbeats: number;
}) => {
  return Array.from({ length: numberOfHearbeats }, () =>
    mockDefendForContainersHeartbeats(isBlockActionEnables)
  );
};
const mockDefendForContainersHeartbeats = (isBlockActionEnabled: boolean) => {
  return {
    agent: {
      id: chance.guid(),
    },
    cloud_defend: {
      block_action_enabled: isBlockActionEnabled,
    },
    event: {
      ingested: new Date().toISOString(),
    },
  };
};
