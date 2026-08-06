/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityCreationCandidate } from './creatable_from_document';
import { getEntityDefinitionWithoutId } from './registry';

describe('getEntityCreationCandidate', () => {
  describe('shared event.outcome gate', () => {
    it('rejects when event.outcome is failure, regardless of entity type', () => {
      expect(
        getEntityCreationCandidate('user', {
          user: { name: 'alice' },
          host: { id: 'host-1' },
          event: { outcome: 'failure' },
        })
      ).toEqual({ accepted: false, reason: 'event_outcome_failure' });

      expect(
        getEntityCreationCandidate('host', {
          host: { id: 'host-1' },
          event: { outcome: 'failure' },
        })
      ).toEqual({ accepted: false, reason: 'event_outcome_failure' });

      expect(
        getEntityCreationCandidate('service', {
          service: { name: 'api-gateway' },
          event: { outcome: 'failure' },
        })
      ).toEqual({ accepted: false, reason: 'event_outcome_failure' });
    });

    it('accepts when event.outcome is missing (ML anomaly-style alerts, e.g. PAD jobs)', () => {
      const result = getEntityCreationCandidate('service', { service: { name: 'api-gateway' } });
      expect(result.accepted).toBe(true);
    });

    it('accepts when event.outcome is unknown', () => {
      const result = getEntityCreationCandidate('service', {
        service: { name: 'api-gateway' },
        event: { outcome: 'unknown' },
      });
      expect(result.accepted).toBe(true);
    });
  });

  describe('generic', () => {
    it('is never creatable (no creatableFromDocument on the definition)', () => {
      expect(getEntityCreationCandidate('generic', { entity: { id: 'e-123' } })).toEqual({
        accepted: false,
        reason: 'entity_type_not_creatable',
      });
    });

    it('has no creatableFromDocument declared on its definition', () => {
      expect(getEntityDefinitionWithoutId('generic').creatableFromDocument).toBeUndefined();
    });
  });

  describe('user', () => {
    it('accepts local-namespace users (user.name + host.id, non-IDP)', () => {
      expect(
        getEntityCreationCandidate('user', {
          user: { name: 'alice' },
          host: { id: 'host-1' },
        })
      ).toEqual({
        accepted: true,
        euid: 'user:alice@host-1@local',
        identityFields: {
          'user.name': 'alice',
          'host.id': 'host-1',
          'entity.namespace': 'local',
        },
      });
    });

    it('rejects IDP-namespace users even when an EUID is derivable', () => {
      expect(
        getEntityCreationCandidate('user', {
          user: { email: 'alice@example.com' },
          event: { kind: 'asset', module: 'okta' },
        })
      ).toEqual({ accepted: false, reason: 'user_not_local_namespace' });
    });

    it('rejects users with no derivable namespace/identity', () => {
      expect(getEntityCreationCandidate('user', { user: {} })).toEqual({
        accepted: false,
        reason: 'user_not_local_namespace',
      });
    });

    it('rejects local-namespace-eligible docs missing an identity field (e.g. no host.id)', () => {
      expect(
        getEntityCreationCandidate('user', {
          user: { name: 'alice' },
        })
      ).toEqual({ accepted: false, reason: 'user_not_local_namespace' });
    });
  });

  describe('host', () => {
    it('accepts hosts carrying host.id', () => {
      expect(getEntityCreationCandidate('host', { host: { id: 'host-1' } })).toEqual({
        accepted: true,
        euid: 'host:host-1',
        identityFields: { 'host.id': 'host-1' },
      });
    });

    it('rejects name-only hosts (no host.id)', () => {
      expect(getEntityCreationCandidate('host', { host: { name: 'server1' } })).toEqual({
        accepted: false,
        reason: 'host_missing_host_id',
      });
    });

    it('rejects hostname-only hosts (no host.id)', () => {
      expect(
        getEntityCreationCandidate('host', { host: { hostname: 'server1.example.com' } })
      ).toEqual({ accepted: false, reason: 'host_missing_host_id' });
    });
  });

  describe('service', () => {
    it('accepts services carrying service.name', () => {
      expect(getEntityCreationCandidate('service', { service: { name: 'api-gateway' } })).toEqual({
        accepted: true,
        euid: 'service:api-gateway',
        identityFields: { 'service.name': 'api-gateway' },
      });
    });

    it('rejects services with no service.name', () => {
      expect(getEntityCreationCandidate('service', { service: {} })).toEqual({
        accepted: false,
        reason: 'no_identity',
      });
    });
  });

  it('rejects when the source document is null or undefined', () => {
    expect(getEntityCreationCandidate('service', null)).toEqual({
      accepted: false,
      reason: 'no_identity',
    });
    expect(getEntityCreationCandidate('service', undefined)).toEqual({
      accepted: false,
      reason: 'no_identity',
    });
  });

  it('unwraps _source like getEuidFromObject', () => {
    expect(getEntityCreationCandidate('host', { _source: { host: { id: 'host-1' } } })).toEqual({
      accepted: true,
      euid: 'host:host-1',
      identityFields: { 'host.id': 'host-1' },
    });
  });
});
