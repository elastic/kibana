/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_EVENT_INDICES_MAX_LENGTH,
  ENDPOINT_EVENTS_INDEX,
  endpointEventIndices,
} from './endpoint_event_indices';

describe('endpointEventIndices', () => {
  it('adds one endpoint pattern per cluster alias in the data view', () => {
    expect(
      endpointEventIndices(['remote_a:logs-aws.cloudtrail*', 'remote_*:logs-*', 'logs-*'])
    ).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX},remote_*:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('stays local when the data view names no cluster', () => {
    expect(endpointEventIndices(['logs-*', 'filebeat-*', 'endgame-*'])).toBe(ENDPOINT_EVENTS_INDEX);
  });

  it('subtracts a remote exclusion instead of searching that cluster', () => {
    expect(
      endpointEventIndices([
        '-remote_a:logs-*',
        'remote_b:-logs-*',
        '-logs-*',
        'remote_kept:logs-*',
      ])
    ).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_kept:${ENDPOINT_EVENTS_INDEX},-remote_a:${ENDPOINT_EVENTS_INDEX},-remote_b:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('keeps a wildcard include from searching an excluded cluster', () => {
    expect(endpointEventIndices(['*:logs-*', '-remote_excluded:*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},*:${ENDPOINT_EVENTS_INDEX},-remote_excluded:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('does not add a cluster the data view excludes', () => {
    expect(endpointEventIndices(['remote_excluded:logs-*', '-remote_excluded:*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},-remote_excluded:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('leaves a cluster in place when the exclusion does not cover endpoint events', () => {
    expect(endpointEventIndices(['remote_kept:logs-*', '-remote_kept:filebeat-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_kept:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('passes a narrower endpoint exclusion through and keeps the cluster', () => {
    expect(
      endpointEventIndices(['remote_a:logs-*', '-remote_a:logs-endpoint.events.network-*'])
    ).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX},-remote_a:logs-endpoint.events.network-*`
    );
  });

  it('does not treat a :: selector as a cluster separator', () => {
    expect(endpointEventIndices(['logs-*::failures'])).toBe(ENDPOINT_EVENTS_INDEX);
    expect(endpointEventIndices(['remote_a:logs-*::data'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('skips ES|QL mode prefixes', () => {
    expect(
      endpointEventIndices(['_any:logs-*', '_remote:logs-*', '_coordinator:logs-*', 'logs-*'])
    ).toBe(ENDPOINT_EVENTS_INDEX);
  });

  it('names each cluster alias once', () => {
    expect(endpointEventIndices(['remote_a:logs-*', 'remote_a:filebeat-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('keeps a wildcard-all alias', () => {
    expect(endpointEventIndices(['*:logs-*'])).toBe(
      `${ENDPOINT_EVENTS_INDEX},*:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('returns the local pattern for an empty or unusable list', () => {
    expect(endpointEventIndices([])).toBe(ENDPOINT_EVENTS_INDEX);
    expect(endpointEventIndices(['', '   ', ':logs-*'])).toBe(ENDPOINT_EVENTS_INDEX);
  });

  it('stops adding aliases once the search target reaches its length cap', () => {
    const patterns = Array.from({ length: 200 }, (_, i) => `cluster${i}:logs-*`);

    expect(endpointEventIndices(patterns).length).toBeLessThanOrEqual(
      ENDPOINT_EVENT_INDICES_MAX_LENGTH
    );
    expect(endpointEventIndices(patterns).startsWith(ENDPOINT_EVENTS_INDEX)).toBe(true);
  });
});
