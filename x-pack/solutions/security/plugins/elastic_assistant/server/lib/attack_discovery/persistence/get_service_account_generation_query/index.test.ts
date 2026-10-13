/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } from '@kbn/discoveries';

import { getServiceAccountGenerationQuery } from '.';
import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../../../../common/constants';

describe('getServiceAccountGenerationQuery', () => {
  const query = getServiceAccountGenerationQuery({
    eventLogIndex: 'test-event-log-index',
    executionUuid: 'test-execution-uuid',
    spaceId: 'test-space-id',
  });

  const filter = (query.query?.bool?.filter ?? []) as unknown[];

  it('searches the event log index', () => {
    expect(query.index).toEqual(['test-event-log-index']);
  });

  it('tolerates a missing event log index', () => {
    expect([query.allow_no_indices, query.ignore_unavailable]).toEqual([true, true]);
  });

  it('only counts, stopping at the first match', () => {
    expect([query.size, query.terminate_after, query.track_total_hits]).toEqual([0, 1, true]);
  });

  it('filters on the Attack Discovery event provider', () => {
    expect(filter).toContainEqual({
      term: { 'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER },
    });
  });

  it('filters on the execution UUID', () => {
    expect(filter).toContainEqual({
      term: { 'kibana.alert.rule.execution.uuid': 'test-execution-uuid' },
    });
  });

  it('filters on the space', () => {
    expect(filter).toContainEqual({ term: { 'kibana.space_ids': 'test-space-id' } });
  });

  it('only matches events tagged as written by a service account', () => {
    expect(filter).toContainEqual({ term: { tags: ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } });
  });

  it('does NOT filter on the user', () => {
    expect(JSON.stringify(filter)).not.toContain('user.name');
  });
});
