/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostStatus } from '../../../../common/endpoint/types';
import { MAX_AMBIGUOUS_CANDIDATES, selectEndpointHost } from './endpoint_host_selection';
import type { EndpointHostCandidate } from './endpoint_host_selection';

const candidate = (
  agentId: string,
  overrides: Partial<EndpointHostCandidate> = {}
): EndpointHostCandidate => ({
  agentId,
  isLive: true,
  status: HostStatus.HEALTHY,
  sortKey: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const ids = (result: ReturnType<typeof selectEndpointHost>): string[] =>
  result.kind === 'ambiguous' ? result.candidates.map((c) => c.agentId) : [];

describe('selectEndpointHost', () => {
  it('returns not_found when no candidates match', () => {
    expect(selectEndpointHost([], { truncated: false })).toEqual({ kind: 'not_found' });
  });

  it('returns not_found for an empty candidate set even when truncated', () => {
    expect(selectEndpointHost([], { truncated: true })).toEqual({ kind: 'not_found' });
  });

  it('finds the single live candidate, even when it is not the newest record', () => {
    const result = selectEndpointHost(
      [
        candidate('stale-newest', {
          isLive: false,
          status: HostStatus.OFFLINE,
          sortKey: '2026-02-01T00:00:00.000Z',
        }),
        candidate('live-older', { sortKey: '2026-01-01T00:00:00.000Z' }),
      ],
      { truncated: false }
    );

    expect(result).toEqual({
      kind: 'found',
      candidate: candidate('live-older', { sortKey: '2026-01-01T00:00:00.000Z' }),
    });
  });

  it('finds the newest non-live candidate when none is live', () => {
    const result = selectEndpointHost(
      [
        candidate('older', {
          isLive: false,
          status: HostStatus.OFFLINE,
          sortKey: '2026-01-01T00:00:00.000Z',
        }),
        candidate('newer', {
          isLive: false,
          status: HostStatus.UNENROLLED,
          sortKey: '2026-02-01T00:00:00.000Z',
        }),
      ],
      { truncated: false }
    );

    expect(result.kind).toBe('found');
    expect(result).toHaveProperty('candidate.agentId', 'newer');
  });

  it('reports a live-only ambiguity with the live candidates only', () => {
    const result = selectEndpointHost(
      [
        candidate('live-older', { sortKey: '2026-01-01T00:00:00.000Z' }),
        candidate('stale', {
          isLive: false,
          status: HostStatus.OFFLINE,
          sortKey: '2026-01-03T00:00:00.000Z',
        }),
        candidate('live-newer', { sortKey: '2026-01-02T00:00:00.000Z' }),
      ],
      { truncated: false }
    );

    expect(result).toEqual({
      kind: 'ambiguous',
      candidates: [
        candidate('live-newer', { sortKey: '2026-01-02T00:00:00.000Z' }),
        candidate('live-older', { sortKey: '2026-01-01T00:00:00.000Z' }),
      ],
    });
    expect(result).not.toHaveProperty('truncated');
  });

  it('reports every sorted candidate, live or not, when the set is truncated', () => {
    const result = selectEndpointHost(
      [
        candidate('stale-older', {
          isLive: false,
          status: HostStatus.OFFLINE,
          sortKey: '2026-01-01T00:00:00.000Z',
        }),
        candidate('live', { sortKey: '2026-01-02T00:00:00.000Z' }),
        candidate('stale-newer', {
          isLive: false,
          status: HostStatus.UNENROLLED,
          sortKey: '2026-01-03T00:00:00.000Z',
        }),
      ],
      { truncated: true }
    );

    expect(result).toHaveProperty('truncated', true);
    expect(ids(result)).toEqual(['live', 'stale-newer', 'stale-older']);
  });

  it('dispatch falls back to the first origin record in merge order when all are unenrolled', () => {
    const originCandidates = [
      candidate('older-first', {
        isLive: false,
        status: HostStatus.UNENROLLED,
        sortKey: '2026-01-01T00:00:00.000Z',
      }),
      candidate('newer-second', {
        isLive: false,
        status: HostStatus.UNENROLLED,
        sortKey: '2026-02-01T00:00:00.000Z',
      }),
    ];

    expect(
      selectEndpointHost(originCandidates, {
        truncated: false,
        dispatch: { originCandidates },
      })
    ).toEqual({ kind: 'found', candidate: originCandidates[0] });
  });

  it('bounds a truncated ambiguity to MAX_AMBIGUOUS_CANDIDATES', () => {
    const candidates = Array.from({ length: MAX_AMBIGUOUS_CANDIDATES + 2 }, (_, i) =>
      candidate(`agent-${i}`, {
        isLive: false,
        status: HostStatus.OFFLINE,
        sortKey: `2026-01-02T00:00:${String(i).padStart(2, '0')}.000Z`,
      })
    );

    const result = selectEndpointHost(candidates, { truncated: true });

    expect(ids(result)).toHaveLength(MAX_AMBIGUOUS_CANDIDATES);
  });
});
