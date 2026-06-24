/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { loadGraphRoleAliases, validateGraphAliasTable } from './load_graph_role_aliases';
import { createKnowledgeIndicatorsReaderFromStreamsStart } from './knowledge_indicators_reader_factory';

const createLogger = (): jest.Mocked<Logger> =>
  ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const schemaFeature = (overrides: Partial<Record<string, unknown>> = {}): Feature =>
  ({
    uuid: 'feature-1',
    stream_name: 'logs-azure.signinlogs-default',
    type: 'schema',
    subtype: 'custom',
    id: 'azure-signinlogs-schema',
    title: 'Azure Sign-in Logs schema',
    description: 'Azure sign-in logs',
    confidence: 88,
    evidence: [],
    evidence_doc_ids: [],
    tags: [],
    meta: {},
    properties: {
      schema_family: 'custom',
      ecs_identity_aliases: {
        'user.email': ['azure.signinlogs.properties.user_principal_name'],
        'service.target.name': ['azure.signinlogs.properties.resource_display_name'],
        'event.action': ['azure.signinlogs.operation_name'],
      },
    },
    ...overrides,
  } as unknown as Feature);

describe('validateGraphAliasTable', () => {
  const context = { streamName: 'logs-azure.signinlogs-default', featureUuid: 'feature-1' };

  it('keeps actor, target, and action destinations from the closed graph vocabulary', () => {
    const logger = createLogger();
    const table = validateGraphAliasTable(
      {
        'user.email': ['azure.signinlogs.properties.user_principal_name'],
        'service.target.name': ['azure.signinlogs.properties.resource_display_name'],
        'event.action': ['azure.signinlogs.operation_name'],
      },
      { ...context, logger }
    );

    expect(table).toBeDefined();
    expect([...table!.keys()].sort()).toEqual([
      'event.action',
      'service.target.name',
      'user.email',
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('drops destinations outside the closed vocabulary and warns', () => {
    const logger = createLogger();
    const table = validateGraphAliasTable(
      {
        'user.email': ['azure.signinlogs.properties.user_principal_name'],
        'user.roles': ['azure.signinlogs.properties.app_roles'],
      },
      { ...context, logger }
    );

    expect([...table!.keys()]).toEqual(['user.email']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user.roles'));
  });

  it('drops a destination whose value is not an array and warns', () => {
    const logger = createLogger();
    const table = validateGraphAliasTable(
      {
        'user.email': 'azure.signinlogs.properties.user_principal_name',
        'user.name': ['azure.signinlogs.identity'],
      },
      { ...context, logger }
    );

    expect([...table!.keys()]).toEqual(['user.name']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-array value'));
  });

  it('filters out empty / non-string sources and drops the key when none remain', () => {
    const logger = createLogger();
    const table = validateGraphAliasTable(
      {
        'user.email': ['', 123, null],
        'user.name': ['azure.signinlogs.identity', ''],
      },
      { ...context, logger }
    );

    expect([...table!.keys()]).toEqual(['user.name']);
    expect(table!.get('user.name')).toEqual(['azure.signinlogs.identity']);
  });

  it('returns undefined for non-object input', () => {
    const logger = createLogger();
    expect(validateGraphAliasTable(null, { ...context, logger })).toBeUndefined();
    expect(validateGraphAliasTable([], { ...context, logger })).toBeUndefined();
    expect(validateGraphAliasTable('x', { ...context, logger })).toBeUndefined();
  });

  it('returns undefined when every key is invalid', () => {
    const logger = createLogger();
    expect(
      validateGraphAliasTable({ 'user.roles': ['x'] }, { ...context, logger })
    ).toBeUndefined();
  });
});

describe('loadGraphRoleAliases', () => {
  const reader = (): jest.Mocked<StreamsKnowledgeIndicatorsReader> =>
    ({
      listEntityFeatures: jest.fn(),
      listDependencyFeatures: jest.fn(),
      listSchemaFeatures: jest.fn(),
      resolveIndexPatterns: jest.fn(),
    } as unknown as jest.Mocked<StreamsKnowledgeIndicatorsReader>);

  it('short-circuits to [] without any reader I/O when minConfidence is null (knob off)', async () => {
    const r = reader();
    const result = await loadGraphRoleAliases(r, { minConfidence: null }, createLogger());

    expect(result).toEqual([]);
    expect(r.listSchemaFeatures).not.toHaveBeenCalled();
    expect(r.resolveIndexPatterns).not.toHaveBeenCalled();
  });

  it('returns [] when no schema features are above threshold', async () => {
    const r = reader();
    r.listSchemaFeatures.mockResolvedValue([]);

    const result = await loadGraphRoleAliases(r, { minConfidence: 50 }, createLogger());
    expect(result).toEqual([]);
    expect(r.listSchemaFeatures).toHaveBeenCalledWith({ minConfidence: 50 });
  });

  it('builds one validated context per schema feature with resolved index patterns', async () => {
    const r = reader();
    r.listSchemaFeatures.mockResolvedValue([schemaFeature()]);
    r.resolveIndexPatterns.mockResolvedValue(['logs-azure.signinlogs-default']);

    const [ctx, ...rest] = await loadGraphRoleAliases(r, { minConfidence: 50 }, createLogger());

    expect(rest).toHaveLength(0);
    expect(ctx.streamName).toBe('logs-azure.signinlogs-default');
    expect(ctx.indexPatterns).toEqual(['logs-azure.signinlogs-default']);
    expect(ctx.featureUuid).toBe('feature-1');
    expect(ctx.confidence).toBe(88);
    expect([...ctx.aliases.keys()].sort()).toEqual([
      'event.action',
      'service.target.name',
      'user.email',
    ]);
  });

  it('drops features with no valid aliases and streams that resolve to no index patterns', async () => {
    const r = reader();
    r.listSchemaFeatures.mockResolvedValue([
      schemaFeature({ uuid: 'no-aliases', properties: { schema_family: 'custom' } }),
      schemaFeature({
        uuid: 'no-index',
        stream_name: 'logs-deleted-stream',
      }),
      schemaFeature({ uuid: 'good' }),
    ]);
    r.resolveIndexPatterns.mockImplementation(async (streamName: string) =>
      streamName === 'logs-deleted-stream' ? [] : [streamName]
    );

    const result = await loadGraphRoleAliases(r, { minConfidence: 50 }, createLogger());

    expect(result.map((c) => c.featureUuid)).toEqual(['good']);
  });

  it('yields [] end-to-end when the streams plugin is absent (no-op reader)', async () => {
    const logger = createLogger();
    const noOpReader = await createKnowledgeIndicatorsReaderFromStreamsStart({
      streams: undefined,
      request: {} as KibanaRequest,
      logger,
    });

    const result = await loadGraphRoleAliases(noOpReader, { minConfidence: 50 }, logger);
    expect(result).toEqual([]);
  });
});
