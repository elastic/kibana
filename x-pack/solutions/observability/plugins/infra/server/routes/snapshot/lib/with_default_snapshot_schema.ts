/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotRequest } from '../../../../common/http_api/snapshot_api';

/**
 * Fills an omitted pod schema with `ecs` at the snapshot HTTP boundary.
 *
 * Pod clients that POST `/api/metrics/snapshot` without `schema` used to match
 * `event.module: kubernetes`. `nodeFilter()` with no schema still returns `[]`
 * for callers that do not go through this route. Hosts are unchanged: an
 * omitted host schema is already the public unfiltered contract.
 */
export const withDefaultSnapshotSchema = (snapshotRequest: SnapshotRequest): SnapshotRequest => {
  if (snapshotRequest.nodeType !== 'pod' || snapshotRequest.schema != null) {
    return snapshotRequest;
  }

  return {
    ...snapshotRequest,
    schema: 'ecs',
  };
};
