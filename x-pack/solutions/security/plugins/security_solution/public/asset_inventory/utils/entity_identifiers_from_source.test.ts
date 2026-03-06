/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIdentifiersFromSource } from './entity_identifiers_from_source';

describe('getEntityIdentifiersFromSource', () => {
  it('extracts user entityIdentifiers via entity store euid (user.entity.id priority)', () => {
    const source = {
      user: { entity: { id: 'user-euid-1' }, name: 'alice', id: 'user-1' },
      entity: { EngineMetadata: { Type: 'user' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'user');
    expect(result).toEqual({ 'user.entity.id': 'user-euid-1' });
  });

  it('extracts user entityIdentifiers when only user.name is present', () => {
    const source = {
      user: { name: 'bob' },
      entity: { EngineMetadata: { Type: 'user' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'user');
    expect(result).toEqual({ 'user.name': 'bob' });
  });

  it('extracts host entityIdentifiers via entity store euid (host.entity.id priority)', () => {
    const source = {
      host: { entity: { id: 'host-euid-1' }, name: 'server1', id: 'host-1' },
      entity: { EngineMetadata: { Type: 'host' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'host');
    expect(result).toEqual({ 'host.entity.id': 'host-euid-1' });
  });

  it('extracts host entityIdentifiers when only host.name is present', () => {
    const source = {
      host: { name: 'my-server' },
      entity: { EngineMetadata: { Type: 'host' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'host');
    expect(result).toEqual({ 'host.name': 'my-server' });
  });

  it('extracts service entityIdentifiers via entity store euid', () => {
    const source = {
      service: { entity: { id: 'svc-euid-1' }, name: 'nginx' },
      entity: { EngineMetadata: { Type: 'service' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'service');
    expect(result).toEqual({ 'service.entity.id': 'svc-euid-1' });
  });

  it('extracts service entityIdentifiers when only service.name is present', () => {
    const source = {
      service: { name: 'api-gateway' },
      entity: { EngineMetadata: { Type: 'service' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'service');
    expect(result).toEqual({ 'service.name': 'api-gateway' });
  });

  it('maps generic entity.id to related.entity for flyout convention', () => {
    const source = {
      entity: { id: 'generic-entity-123', EngineMetadata: { Type: 'generic' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'generic');
    expect(result).toEqual({ 'related.entity': 'generic-entity-123' });
  });

  it('maps container type to generic and returns related.entity', () => {
    const source = {
      entity: { id: 'container-123', EngineMetadata: { Type: 'container' } },
    };
    const result = getEntityIdentifiersFromSource(source, 'container');
    expect(result).toEqual({ 'related.entity': 'container-123' });
  });

  it('derives entity type from source when entityType not passed', () => {
    const source = {
      host: { name: 'derived-host' },
      entity: { EngineMetadata: { Type: 'host' } },
    };
    const result = getEntityIdentifiersFromSource(source);
    expect(result).toEqual({ 'host.name': 'derived-host' });
  });
});
