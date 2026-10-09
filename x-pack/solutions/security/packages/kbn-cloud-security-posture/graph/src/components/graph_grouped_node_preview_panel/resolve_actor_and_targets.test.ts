/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { MAX_VALUE_COMBINATIONS, resolveActorAndTargets } from './resolve_actor_and_targets';

const GCP = { 'event.module': 'gcp', 'data_stream.dataset': 'gcp.audit' };

describe('resolveActorAndTargets', () => {
  describe('actor', () => {
    it('resolves a user from flat fields', () => {
      const { actorId } = resolveActorAndTargets({ ...GCP, 'user.id': 'admin@example.com' }, euid);

      expect(actorId).toBe('user:admin@example.com@gcp');
    });

    it('resolves a user from a nested source', () => {
      const { actorId } = resolveActorAndTargets(
        {
          event: { module: 'gcp' },
          data_stream: { dataset: 'gcp.audit' },
          user: { id: 'admin@example.com' },
        },
        euid
      );

      expect(actorId).toBe('user:admin@example.com@gcp');
    });

    it('prefers user over host and service', () => {
      const { actorId } = resolveActorAndTargets(
        { ...GCP, 'user.id': 'admin@example.com', 'host.name': 'srv', 'service.name': 'svc' },
        euid
      );

      expect(actorId).toBe('user:admin@example.com@gcp');
    });

    it('falls back to host, then service, then generic', () => {
      expect(
        resolveActorAndTargets({ 'host.name': 'srv', 'service.name': 'svc' }, euid).actorId
      ).toBe('host:srv');
      expect(resolveActorAndTargets({ 'service.name': 'svc' }, euid).actorId).toBe('service:svc');
      expect(resolveActorAndTargets({ 'entity.id': 'projects/p/roles/r' }, euid).actorId).toBe(
        'projects/p/roles/r'
      );
    });

    it('resolves nothing when there are no identity fields or they are empty', () => {
      expect(resolveActorAndTargets({}, euid).actorId).toBeUndefined();
      expect(resolveActorAndTargets({ ...GCP, 'user.id': '' }, euid).actorId).toBeUndefined();
    });

    it('does not read target fields as the actor', () => {
      const { actorId } = resolveActorAndTargets({ ...GCP, 'user.target.id': 't@x.com' }, euid);

      expect(actorId).toBeUndefined();
    });

    it('does not read the legacy actor.entity.id field', () => {
      const { actorId, targetIds } = resolveActorAndTargets(
        { actor: { entity: { id: 'legacy' } }, target: { entity: { id: 'legacy-t' } } },
        euid
      );

      expect(actorId).toBeUndefined();
      expect(targetIds).toEqual([]);
    });

    it('keeps the same user id in different namespaces apart', () => {
      const gcp = resolveActorAndTargets({ ...GCP, 'user.id': 'x@y.com' }, euid).actorId;
      const okta = resolveActorAndTargets(
        { 'event.module': 'okta', 'data_stream.dataset': 'okta.system', 'user.id': 'x@y.com' },
        euid
      ).actorId;

      expect(gcp).toBe('user:x@y.com@gcp');
      expect(okta).toBeDefined();
      expect(okta).not.toBe(gcp);
    });
  });

  describe('targets', () => {
    it('resolves a target of each type', () => {
      expect(
        resolveActorAndTargets({ ...GCP, 'user.target.id': 't@x.com' }, euid).targetIds
      ).toEqual(['user:t@x.com@gcp']);
      expect(resolveActorAndTargets({ 'host.target.name': 'srv' }, euid).targetIds).toEqual([
        'host:srv',
      ]);
      expect(resolveActorAndTargets({ 'service.target.name': 'svc' }, euid).targetIds).toEqual([
        'service:svc',
      ]);
      expect(
        resolveActorAndTargets({ 'entity.target.id': 'projects/p/roles/r' }, euid).targetIds
      ).toEqual(['projects/p/roles/r']);
    });

    it('does not resolve a host-only target as a user target too', () => {
      const { targetIds } = resolveActorAndTargets({ 'host.target.id': 'h1' }, euid);

      expect(targetIds).toEqual(['host:h1']);
    });

    it('accumulates targets of every type in rank order', () => {
      const { targetIds } = resolveActorAndTargets(
        {
          ...GCP,
          'entity.target.id': 'projects/p/roles/r',
          'service.target.name': 'svc',
          'user.target.id': 't@x.com',
        },
        euid
      );

      expect(targetIds).toEqual(['user:t@x.com@gcp', 'service:svc', 'projects/p/roles/r']);
    });

    it('resolves one target per value of a multi-value field', () => {
      const { targetIds } = resolveActorAndTargets(
        { ...GCP, 'user.target.id': ['a@x.com', 'b@x.com'] },
        euid
      );

      expect(targetIds).toEqual(['user:a@x.com@gcp', 'user:b@x.com@gcp']);
    });

    it('removes duplicate targets', () => {
      const { targetIds } = resolveActorAndTargets({ 'entity.target.id': ['r', 'r'] }, euid);

      expect(targetIds).toEqual(['r']);
    });

    it('resolves no targets when there are none', () => {
      expect(resolveActorAndTargets({}, euid).targetIds).toEqual([]);
    });

    it('caps the number of resolved combinations per type', () => {
      const manyUsers = Array.from({ length: 150 }, (_, index) => `u${index}@x.com`);

      const { targetIds } = resolveActorAndTargets({ ...GCP, 'user.target.id': manyUsers }, euid);

      expect(targetIds).toHaveLength(MAX_VALUE_COMBINATIONS);
    });

    it('bounds the work for documents with huge multi-value fields', () => {
      const huge = Array.from({ length: 200_000 }, (_, index) => `u${index}@x.com`);
      const startedAt = Date.now();

      const { targetIds } = resolveActorAndTargets(
        { ...GCP, 'user.target.email': huge, 'user.target.id': huge },
        euid
      );

      expect(Date.now() - startedAt).toBeLessThan(1000);
      expect(targetIds.length).toBeLessThanOrEqual(MAX_VALUE_COMBINATIONS);
    });
  });
});
