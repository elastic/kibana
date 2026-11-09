/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTZERO_AI_INDICES } from './ai_index_registry';
import { installSpaceScopedIndexTemplates } from './write_gate';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const createClient = (putIndexTemplate: jest.Mock) =>
  ({
    indices: {
      getIndexTemplate: jest.fn().mockResolvedValue({ index_templates: [] }),
      putIndexTemplate,
      exists: jest.fn().mockResolvedValue(false),
      getMapping: jest.fn(),
    },
  } as unknown as ElasticsearchClient);

describe('installSpaceScopedIndexTemplates', () => {
  it('installs the template of each space-scoped AlertZero index under its shipped name', async () => {
    const putIndexTemplate = jest.fn().mockResolvedValue({ acknowledged: true });

    installSpaceScopedIndexTemplates({
      aiIndices: ALERTZERO_AI_INDICES,
      esClient: createClient(putIndexTemplate),
      logger: loggerMock.create(),
    });
    await flushPromises();

    expect(putIndexTemplate).toHaveBeenCalledTimes(2);
    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'security-attack-fingerprint',
        index_patterns: ['ai-index-idx-security-attack-fingerprints'],
      })
    );
    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'security-triage-decisions',
        index_patterns: ['ai-index-idx-security-triage-decisions'],
      })
    );
  });

  it('refuses writes until the template install succeeds', async () => {
    let finishInstall: (value: { acknowledged: boolean }) => void = () => undefined;
    const install = new Promise<{ acknowledged: boolean }>((resolve) => {
      finishInstall = resolve;
    });

    const gates = installSpaceScopedIndexTemplates({
      aiIndices: ALERTZERO_AI_INDICES,
      esClient: createClient(jest.fn().mockReturnValue(install)),
      logger: loggerMock.create(),
    });

    expect(gates.isWritable('security-attack-fingerprints')).toBe(false);
    await flushPromises();
    expect(gates.isWritable('security-attack-fingerprints')).toBe(false);

    finishInstall({ acknowledged: true });
    await flushPromises();

    expect(gates.isWritable('security-attack-fingerprints')).toBe(true);
  });

  it('keeps writes refused when the template install fails', async () => {
    const logger = loggerMock.create();
    const gates = installSpaceScopedIndexTemplates({
      aiIndices: ALERTZERO_AI_INDICES,
      esClient: createClient(jest.fn().mockRejectedValue(new Error('security_exception'))),
      logger,
    });
    await flushPromises();

    expect(gates.isWritable('security-attack-fingerprints')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'Attack fingerprint index template was not installed: security_exception'
    );
  });

  it('gates each space-scoped index on its own template install', async () => {
    const putIndexTemplate = jest.fn(({ name }: { name: string }) =>
      name === 'security-example-a'
        ? Promise.resolve({ acknowledged: true })
        : Promise.reject(new Error('security_exception'))
    );
    const gates = installSpaceScopedIndexTemplates({
      aiIndices: [
        {
          id: 'example-a',
          description: 'A',
          spaceScopedTemplate: { templateName: 'security-example-a', logLabel: 'Example A' },
        },
        {
          id: 'example-b',
          description: 'B',
          spaceScopedTemplate: { templateName: 'security-example-b', logLabel: 'Example B' },
        },
      ],
      esClient: createClient(putIndexTemplate),
      logger: loggerMock.create(),
    });
    await flushPromises();

    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ index_patterns: ['ai-index-idx-example-b'] })
    );
    expect(gates.isWritable('example-a')).toBe(true);
    expect(gates.isWritable('example-b')).toBe(false);
  });

  it('allows writes to an index that is not space-scoped', () => {
    const putIndexTemplate = jest.fn();
    const gates = installSpaceScopedIndexTemplates({
      aiIndices: ALERTZERO_AI_INDICES,
      esClient: createClient(putIndexTemplate),
      logger: loggerMock.create(),
    });

    expect(gates.isWritable('security-investigations')).toBe(true);
  });
});
