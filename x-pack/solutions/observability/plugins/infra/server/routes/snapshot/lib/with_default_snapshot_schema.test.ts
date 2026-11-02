/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotRequest } from '../../../../common/http_api/snapshot_api';
import { withDefaultSnapshotSchema } from './with_default_snapshot_schema';

const podRequest = {
  metrics: [{ type: 'cpu' as const }],
  groupBy: [],
  nodeType: 'pod' as const,
  timerange: { interval: '1m', to: 1, from: 0 },
  sourceId: 'default',
};

describe('withDefaultSnapshotSchema', () => {
  it('defaults an omitted pod schema to ecs', () => {
    const request: SnapshotRequest = { ...podRequest };

    expect(withDefaultSnapshotSchema(request)).toEqual({ ...request, schema: 'ecs' });
  });

  it('keeps an explicit pod schema', () => {
    const semconv: SnapshotRequest = { ...podRequest, schema: 'semconv' };
    const ecs: SnapshotRequest = { ...podRequest, schema: 'ecs' };

    expect(withDefaultSnapshotSchema(semconv)).toBe(semconv);
    expect(withDefaultSnapshotSchema(ecs)).toBe(ecs);
  });

  it('leaves an omitted host schema unset', () => {
    const host: SnapshotRequest = { ...podRequest, nodeType: 'host' };

    expect(withDefaultSnapshotSchema(host)).toBe(host);
    expect(withDefaultSnapshotSchema(host).schema).toBeUndefined();
  });
});
