/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLogsPerCycleCapProbeQuery } from './logs_cap_probe_query_builder';

describe('buildLogsPerCycleCapProbeQuery', () => {
  it('should build the expected query for host', () => {
    const query = buildLogsPerCycleCapProbeQuery({
      indexPatterns: ['logs-*'],
      type: 'host',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerCycle: 1_000_000,
    });

    expect(query).toMatchSnapshot();
  });

  it('should build the expected query for user', () => {
    const query = buildLogsPerCycleCapProbeQuery({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerCycle: 1_000_000,
    });

    expect(query).toMatchSnapshot();
  });
});
