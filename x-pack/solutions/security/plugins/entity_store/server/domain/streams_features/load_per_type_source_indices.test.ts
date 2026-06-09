/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import {
  deriveEntityFieldPresence,
  loadPerTypeSourceIndices,
} from './load_per_type_source_indices';

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as Logger;

const makeFeature = (overrides: Partial<Feature> & { stream_name: string }): Feature =>
  ({
    id: `feature-${overrides.stream_name}`,
    uuid: `uuid-${overrides.stream_name}`,
    type: 'schema',
    description: 'schema feature',
    confidence: 90,
    status: 'active',
    last_seen: '2026-06-01T00:00:00.000Z',
    properties: {},
    ...overrides,
  } as Feature);

const makeReader = (
  features: Feature[],
  resolve: (streamName: string) => string[] = (streamName) => [streamName]
): StreamsKnowledgeIndicatorsReader => ({
  listEntityFeatures: jest.fn(async () => []),
  listDependencyFeatures: jest.fn(async () => []),
  listSchemaFeatures: jest.fn(async () => features),
  resolveIndexPatterns: jest.fn(async (streamName: string) => resolve(streamName)),
});

describe('deriveEntityFieldPresence', () => {
  it('reads explicit entity_field_presence values, intersected with the identity vocab', () => {
    const present = deriveEntityFieldPresence(
      makeFeature({
        stream_name: 'logs.app',
        properties: {
          entity_field_presence: {
            user: ['user.name', 'user.email'],
            host: ['host.name'],
            // hallucinated field is dropped:
            misc: ['not.an.identity.field'],
          },
        },
      })
    );
    expect(present).toEqual(new Set(['user.name', 'user.email', 'host.name']));
  });

  it('reads ecs_identity_aliases keys as present identity fields', () => {
    const present = deriveEntityFieldPresence(
      makeFeature({
        stream_name: 'logs.azure',
        properties: {
          ecs_identity_aliases: {
            'user.email': ['azure.signin.userPrincipalName'],
            'host.name': ['azure.resource.host'],
          },
        },
      })
    );
    expect(present).toEqual(new Set(['user.email', 'host.name']));
  });

  it('falls back to scanning evidence strings for verbatim identity field names', () => {
    const present = deriveEntityFieldPresence(
      makeFeature({
        stream_name: 'logs.custom',
        evidence: ['field service.name observed in 92% of docs', 'no identity here'],
      })
    );
    expect(present).toEqual(new Set(['service.name']));
  });

  it('returns an empty set when nothing surfaces identity fields', () => {
    const present = deriveEntityFieldPresence(
      makeFeature({ stream_name: 'logs.noise', evidence: ['only message.text seen'] })
    );
    expect(present.size).toBe(0);
  });
});

describe('loadPerTypeSourceIndices', () => {
  it('short-circuits with empty sources and no I/O when minConfidence is null', async () => {
    const reader = makeReader([makeFeature({ stream_name: 'logs.app' })]);
    const { sources, provenance } = await loadPerTypeSourceIndices(
      reader,
      { minConfidence: null },
      logger
    );
    expect(reader.listSchemaFeatures).not.toHaveBeenCalled();
    expect(sources).toEqual({ user: [], host: [], service: [], generic: [] });
    expect(provenance).toEqual([]);
  });

  it('qualifies a stream for every entity type whose identity fields it carries', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.okta',
        properties: {
          entity_field_presence: { user: ['user.name'], host: ['host.id'] },
        },
      }),
      makeFeature({
        stream_name: 'logs.apm',
        properties: { entity_field_presence: { service: ['service.name'] } },
      }),
    ]);

    const { sources } = await loadPerTypeSourceIndices(reader, { minConfidence: 0 }, logger);

    expect(sources.user).toEqual(['logs.okta']);
    expect(sources.host).toEqual(['logs.okta']);
    expect(sources.service).toEqual(['logs.apm']);
    expect(sources.generic).toEqual([]);
  });

  it('passes the configured confidence floor to the reader', async () => {
    const reader = makeReader([]);
    await loadPerTypeSourceIndices(reader, { minConfidence: 75 }, logger);
    expect(reader.listSchemaFeatures).toHaveBeenCalledWith({ minConfidence: 75 });
  });

  it('returns empty sources when there are zero schema features', async () => {
    const reader = makeReader([]);
    const { sources, provenance } = await loadPerTypeSourceIndices(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(sources).toEqual({ user: [], host: [], service: [], generic: [] });
    expect(provenance).toEqual([]);
  });

  it('skips streams that resolve to no index patterns (deleted / inaccessible)', async () => {
    const reader = makeReader(
      [
        makeFeature({
          stream_name: 'logs.gone',
          properties: { entity_field_presence: { user: ['user.name'] } },
        }),
      ],
      () => [] // resolveIndexPatterns returns nothing
    );
    const { sources, provenance } = await loadPerTypeSourceIndices(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(sources.user).toEqual([]);
    expect(provenance).toEqual([]);
  });

  it('dedupes patterns and records provenance with matched fields', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.dup',
        confidence: 80,
        properties: { entity_field_presence: { user: ['user.name', 'user.email'] } },
      }),
      makeFeature({
        stream_name: 'logs.dup',
        confidence: 70,
        properties: { entity_field_presence: { user: ['user.id'] } },
      }),
    ]);

    const { sources, provenance } = await loadPerTypeSourceIndices(
      reader,
      { minConfidence: 0 },
      logger
    );

    expect(sources.user).toEqual(['logs.dup']);
    expect(provenance).toHaveLength(2);
    expect(provenance[0]).toMatchObject({
      entityType: 'user',
      streamName: 'logs.dup',
      matchedFields: ['user.email', 'user.name'].sort(),
    });
  });
});
