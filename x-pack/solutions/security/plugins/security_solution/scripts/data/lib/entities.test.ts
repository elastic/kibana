/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickHostPool, pickUserPool } from './entities';
import { enrichDocForGraph, relatedFields } from './graph_enrichment';

describe('relatedFields', () => {
  it('returns related user host and ip arrays', () => {
    expect(
      relatedFields(
        { name: 'WIN-ANALYST01', hostname: 'WIN-ANALYST01', ip: ['10.0.1.45'] },
        { name: 'jsmith', email: 'jsmith@corp.example' },
        ['192.0.2.10']
      )
    ).toEqual({
      related: {
        user: ['jsmith', 'jsmith@corp.example'],
        hosts: ['WIN-ANALYST01'],
        ip: ['10.0.1.45', '192.0.2.10'],
      },
    });
  });
});

describe('enrichDocForGraph', () => {
  it('sets host.target when both user and host are present', () => {
    const doc: Record<string, unknown> = {
      host: { name: 'WIN-ANALYST01', id: 'h1' },
      user: { name: 'jsmith', id: 'u1' },
    };
    enrichDocForGraph(doc);
    expect(doc['host.target']).toEqual({ name: 'WIN-ANALYST01', id: 'h1' });
  });

  it('sets user.target when only user is present', () => {
    const doc: Record<string, unknown> = {
      user: { name: 'dev-user', id: 'u2' },
    };
    enrichDocForGraph(doc);
    expect(doc['user.target']).toEqual({ name: 'dev-user', id: 'u2' });
  });

  it('does not set host.target when only host is present', () => {
    const doc: Record<string, unknown> = {
      host: { name: 'DC-CORP01', id: 'h2' },
    };
    enrichDocForGraph(doc);
    expect(doc['host.target']).toBeUndefined();
  });

  it('preserves explicit targets', () => {
    const doc: Record<string, unknown> = {
      host: { name: 'a', id: '1' },
      user: { name: 'b', id: '2' },
      'user.target': { name: 'victim' },
    };
    enrichDocForGraph(doc);
    expect(doc['user.target']).toEqual({ name: 'victim' });
    expect(doc['host.target']).toBeUndefined();
  });

  it('preserves ported entity.relationships on enrich', () => {
    const relationships = { communicates_with: ['WIN-ANALYST02'] };
    const doc: Record<string, unknown> = {
      host: { name: 'WIN-ANALYST01', id: 'h1', entity: { relationships } },
      user: { name: 'jsmith', id: 'u1' },
    };
    enrichDocForGraph(doc);
    expect((doc.host as { entity: { relationships: unknown } }).entity.relationships).toEqual(
      relationships
    );
  });
});

describe('entity catalog pickers', () => {
  it('returns the requested host count', () => {
    expect(pickHostPool({ count: 4, seed: 's', riskyCount: 2 })).toHaveLength(4);
  });

  it('returns the requested user count', () => {
    expect(pickUserPool({ count: 3, seed: 's', riskyCount: 2 })).toHaveLength(3);
  });
});
