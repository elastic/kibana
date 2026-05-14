/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ECS_IDENTITY_FIELD_SET,
  loadStreamSchemaAliases,
  validateAliasTable,
} from './load_stream_schema_aliases';

const buildSchemaFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    uuid: 'feature-uuid-1',
    id: 'feature-1',
    stream_name: 'logs.azure.signinlogs',
    type: 'schema',
    subtype: 'azure_signin',
    title: 'Azure sign-in identity aliases',
    description: 'aliases user.email/id to azure UPN/oid',
    properties: {
      schema_family: 'custom',
      ecs_identity_aliases: {
        'user.email': ['azure.signinlogs.properties.user_principal_name'],
        'user.id': ['azure.signinlogs.properties.user_id'],
      },
    },
    confidence: 90,
    status: 'active',
    last_seen: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Feature);

const buildReader = (): jest.Mocked<StreamsKnowledgeIndicatorsReader> => ({
  listEntityFeatures: jest.fn().mockResolvedValue([]),
  listDependencyFeatures: jest.fn().mockResolvedValue([]),
  listSchemaFeatures: jest.fn().mockResolvedValue([]),
  resolveIndexPatterns: jest.fn().mockResolvedValue([]),
});

describe('validateAliasTable', () => {
  const baseContext = {
    streamName: 'logs.azure.signinlogs',
    featureUuid: 'feature-uuid-1',
    logger: loggerMock.create(),
  };

  it('keeps only ECS identity destinations from the closed vocabulary', () => {
    const result = validateAliasTable(
      {
        'user.email': ['azure.signinlogs.properties.user_principal_name'],
        'user.weird_field': ['azure.signinlogs.properties.something'],
        'host.name': ['azure.signinlogs.properties.computer_name'],
      },
      baseContext
    );
    expect(result).toBeDefined();
    expect(Array.from(result!.keys()).sort()).toEqual(['host.name', 'user.email']);
  });

  it('warns once per unknown destination so LLM regressions are greppable', () => {
    const logger = loggerMock.create();
    validateAliasTable(
      {
        'user.email': ['azure.signinlogs.properties.user_principal_name'],
        'user.weird_field': ['azure.signinlogs.properties.something'],
        'azure.target_field': ['azure.signinlogs.properties.target_userPrincipalName'],
      },
      { ...baseContext, logger }
    );
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user.weird_field'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('azure.target_field'));
  });

  it('drops non-array values with a warn log', () => {
    const logger = loggerMock.create();
    const result = validateAliasTable(
      {
        'user.email': 'azure.signinlogs.properties.user_principal_name',
        'user.id': ['azure.signinlogs.properties.user_id'],
      },
      { ...baseContext, logger }
    );
    expect(result).toBeDefined();
    expect(Array.from(result!.keys())).toEqual(['user.id']);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user.email'));
  });

  it('drops keys whose source list contains no usable strings', () => {
    const result = validateAliasTable(
      {
        'user.email': [],
        'user.id': [42, null, '', 'azure.signinlogs.properties.user_id'],
      },
      baseContext
    );
    expect(result).toBeDefined();
    expect(Array.from(result!.keys())).toEqual(['user.id']);
    expect(result!.get('user.id')).toEqual(['azure.signinlogs.properties.user_id']);
  });

  it('returns undefined when no valid aliases remain so callers can short-circuit', () => {
    const result = validateAliasTable(
      {
        'user.weird_field': ['azure.signinlogs.properties.something'],
        'user.email': [],
      },
      baseContext
    );
    expect(result).toBeUndefined();
  });

  it.each([null, undefined, 'string', 42, true, ['a', 'b']])(
    'returns undefined for non-object input %p',
    (input) => {
      expect(validateAliasTable(input, baseContext)).toBeUndefined();
    }
  );

  it('exposes the closed vocabulary as a stable union for downstream type checks', () => {
    expect(ECS_IDENTITY_FIELD_SET).toEqual([
      'user.email',
      'user.id',
      'user.name',
      'user.domain',
      'host.id',
      'host.name',
      'host.hostname',
      'service.name',
      'entity.namespace',
    ]);
  });
});

describe('loadStreamSchemaAliases', () => {
  let reader: jest.Mocked<StreamsKnowledgeIndicatorsReader>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    reader = buildReader();
    logger = loggerMock.create();
  });

  it('short-circuits to [] without calling the reader when minConfidence is null (alias adoption disabled)', async () => {
    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: null }, logger);
    expect(contexts).toEqual([]);
    expect(reader.listSchemaFeatures).not.toHaveBeenCalled();
    expect(reader.resolveIndexPatterns).not.toHaveBeenCalled();
  });

  it('forwards minConfidence to the reader and resolves index patterns once per distinct stream', async () => {
    reader.listSchemaFeatures.mockResolvedValue([
      buildSchemaFeature({ uuid: 'f1', stream_name: 'logs.azure.signinlogs' }),
      buildSchemaFeature({ uuid: 'f2', stream_name: 'logs.azure.signinlogs' }),
      buildSchemaFeature({ uuid: 'f3', stream_name: 'logs.okta.system' }),
    ]);
    reader.resolveIndexPatterns.mockImplementation(async (streamName: string) => {
      if (streamName === 'logs.azure.signinlogs') return ['logs-azure.signinlogs-*'];
      if (streamName === 'logs.okta.system') return ['logs-okta.system-*'];
      return [];
    });

    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: 80 }, logger);

    expect(reader.listSchemaFeatures).toHaveBeenCalledWith({ minConfidence: 80 });
    expect(reader.resolveIndexPatterns).toHaveBeenCalledTimes(2);
    expect(contexts).toHaveLength(3);
  });

  it('groups multiple schema features per stream as separate contexts (do not merge)', async () => {
    const features = [
      buildSchemaFeature({
        uuid: 'f1',
        confidence: 90,
        properties: {
          ecs_identity_aliases: { 'user.email': ['azure.upn'] },
        },
      }),
      buildSchemaFeature({
        uuid: 'f2',
        confidence: 75,
        properties: {
          ecs_identity_aliases: { 'user.id': ['azure.oid'] },
        },
      }),
    ];
    reader.listSchemaFeatures.mockResolvedValue(features);
    reader.resolveIndexPatterns.mockResolvedValue(['logs-azure.signinlogs-*']);

    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: 70 }, logger);

    expect(contexts).toHaveLength(2);
    expect(contexts[0].featureUuid).toBe('f1');
    expect(contexts[0].confidence).toBe(90);
    expect(Array.from(contexts[0].aliases.keys())).toEqual(['user.email']);
    expect(contexts[1].featureUuid).toBe('f2');
    expect(contexts[1].confidence).toBe(75);
    expect(Array.from(contexts[1].aliases.keys())).toEqual(['user.id']);
  });

  it('drops features whose alias table has no entries in the closed vocabulary', async () => {
    reader.listSchemaFeatures.mockResolvedValue([
      buildSchemaFeature({
        uuid: 'good',
        properties: {
          ecs_identity_aliases: { 'user.email': ['azure.upn'] },
        },
      }),
      buildSchemaFeature({
        uuid: 'all-bad',
        properties: {
          ecs_identity_aliases: { 'user.weird_field': ['azure.something'] },
        },
      }),
      buildSchemaFeature({
        uuid: 'no-aliases',
        properties: {
          schema_family: 'ecs',
        },
      }),
    ]);
    reader.resolveIndexPatterns.mockResolvedValue(['logs-azure.signinlogs-*']);

    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: 70 }, logger);

    expect(contexts.map((c) => c.featureUuid)).toEqual(['good']);
  });

  it('drops contexts for streams whose index patterns cannot be resolved', async () => {
    reader.listSchemaFeatures.mockResolvedValue([
      buildSchemaFeature({ uuid: 'f1', stream_name: 'logs.azure.signinlogs' }),
      buildSchemaFeature({ uuid: 'f2', stream_name: 'logs.deleted.stream' }),
    ]);
    reader.resolveIndexPatterns.mockImplementation(async (streamName: string) => {
      if (streamName === 'logs.azure.signinlogs') return ['logs-azure.signinlogs-*'];
      return [];
    });

    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: 70 }, logger);

    expect(contexts).toHaveLength(1);
    expect(contexts[0].streamName).toBe('logs.azure.signinlogs');
  });

  it('warns and falls back to empty index patterns when resolveIndexPatterns throws', async () => {
    reader.listSchemaFeatures.mockResolvedValue([
      buildSchemaFeature({ uuid: 'f1', stream_name: 'logs.permission.denied' }),
    ]);
    reader.resolveIndexPatterns.mockRejectedValue(new Error('permission denied'));

    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: 70 }, logger);

    expect(contexts).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('logs.permission.denied'));
  });

  it('preserves the schema feature filter on each emitted context', async () => {
    const filter = { field: 'event.action', eq: 'UserLoggedIn' } as const;
    reader.listSchemaFeatures.mockResolvedValue([buildSchemaFeature({ uuid: 'f1', filter })]);
    reader.resolveIndexPatterns.mockResolvedValue(['logs-azure.signinlogs-*']);

    const contexts = await loadStreamSchemaAliases(reader, { minConfidence: 70 }, logger);

    expect(contexts[0].filter).toEqual(filter);
  });
});
