/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityFromSource } from './entity_from_source';
import { getEntityCreationCandidate } from '../../../common/domain/definitions/creatable_from_document';
import type { EntityCreationAccepted } from '../../../common/domain/definitions/creatable_from_document';

const acceptedCandidateFor = (source: unknown): EntityCreationAccepted => {
  const candidate = getEntityCreationCandidate('host', source);
  if (!candidate.accepted) {
    throw new Error(`expected source to be accepted, got rejection reason: ${candidate.reason}`);
  }
  return candidate;
};

describe('buildEntityFromSource lifecycle bounds', () => {
  // The representative document is deliberately the *newest* matching alert
  // (`fetchAlertIdentityDocs`), so using it for `first_seen` would be wrong — and permanently so,
  // since logs extraction merges lifecycle bounds as `first_seen = COALESCE(first_seen, recent…)`.
  it('sets entity.lifecycle.last_seen from the source @timestamp but leaves first_seen unset', () => {
    const source = {
      '@timestamp': '2026-01-01T00:00:00.000Z',
      host: { id: 'host-1', name: 'server1' },
    };

    const entity = buildEntityFromSource({
      entityType: 'host',
      candidate: acceptedCandidateFor(source),
      source,
      createdBy: 'risk_score_maintainer',
    });

    expect(entity).toMatchObject({
      entity: { lifecycle: { last_seen: '2026-01-01T00:00:00.000Z' } },
    });
    expect(entity).not.toMatchObject({ entity: { lifecycle: { first_seen: expect.anything() } } });
  });

  it('omits entity.lifecycle entirely when the source document has no @timestamp', () => {
    const source = { host: { id: 'host-1' } };

    const entity = buildEntityFromSource({
      entityType: 'host',
      candidate: acceptedCandidateFor(source),
      source,
      createdBy: 'risk_score_maintainer',
    });

    expect(entity).not.toMatchObject({ entity: { lifecycle: expect.anything() } });
  });
});
