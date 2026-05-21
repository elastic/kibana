/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  INFERENCE_BATCH_SIZE,
  buildIdentityString,
  embedBatch,
  EMBED_SOURCE_FIELDS,
} from '../embed';

describe('buildIdentityString', () => {
  it('produces a deterministic, lowercased, key-value string when all three fields are present', () => {
    expect(
      buildIdentityString({
        name: 'Alice.Patterson',
        full_name: 'Alice Patterson',
        email: 'alice@corp.com',
      })
    ).toBe('name: alice.patterson; full_name: alice patterson; email: alice@corp.com');
  });

  it('omits fields whose value is undefined', () => {
    expect(buildIdentityString({ name: 'bob', email: 'bob@corp.com' })).toBe(
      'name: bob; email: bob@corp.com'
    );
  });

  it('omits fields whose value is an empty string after trimming', () => {
    expect(buildIdentityString({ name: '   ', full_name: 'Nora Patterson', email: '' })).toBe(
      'full_name: nora patterson'
    );
  });

  it('uses a stable key order (name, full_name, email) regardless of input order', () => {
    // We intentionally feed the object keys in a different order to confirm
    // the output is driven by EMBED_SOURCE_FIELDS, not Object.keys() order.
    expect(
      buildIdentityString({
        email: 'eve@corp.com',
        full_name: 'Eve Adams',
        name: 'eve',
      })
    ).toBe('name: eve; full_name: eve adams; email: eve@corp.com');
  });

  it('lowercases mixed-case email to normalise the #13 case-mismatch shape', () => {
    expect(buildIdentityString({ name: 'alice', email: 'Alice@Corp.Com' })).toBe(
      'name: alice; email: alice@corp.com'
    );
  });

  it('returns an empty string when no fields are usable', () => {
    expect(buildIdentityString({})).toBe('');
    expect(buildIdentityString({ name: '', full_name: undefined, email: '   ' })).toBe('');
  });
});

describe('CURRENT_EMBED_SOURCE_VERSION', () => {
  it('captures the field set and template version used by buildIdentityString', () => {
    // Snapshot-style: bump this string whenever EMBED_SOURCE_FIELDS or the
    // template format changes, so the run loop knows to re-embed everyone.
    expect(CURRENT_EMBED_SOURCE_VERSION).toBe('v1:name,full_name,email|key-value');
  });

  it('declares the fields that drive identity strings, in order', () => {
    expect(EMBED_SOURCE_FIELDS).toEqual(['name', 'full_name', 'email']);
  });
});

describe('embedBatch', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = {
      inference: { inference: jest.fn() },
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  it('calls esClient.inference.inference once with the configured endpoint and the input list', async () => {
    (esClient.inference.inference as jest.Mock).mockResolvedValueOnce({
      text_embedding: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
    });

    const vectors = await embedBatch({
      esClient,
      inferenceId: '.jina-embeddings-v5-text-small',
      inputs: ['name: alice', 'name: bob'],
    });

    expect(esClient.inference.inference).toHaveBeenCalledTimes(1);
    expect(esClient.inference.inference).toHaveBeenCalledWith({
      inference_id: '.jina-embeddings-v5-text-small',
      task_type: 'text_embedding',
      input: ['name: alice', 'name: bob'],
    });
    expect(vectors).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it('returns an empty array without calling the inference API when given no inputs', async () => {
    const vectors = await embedBatch({
      esClient,
      inferenceId: '.jina-embeddings-v5-text-small',
      inputs: [],
    });

    expect(vectors).toEqual([]);
    expect(esClient.inference.inference).not.toHaveBeenCalled();
  });

  it('throws a descriptive error when the response shape is missing the text_embedding array', async () => {
    (esClient.inference.inference as jest.Mock).mockResolvedValueOnce({});

    await expect(
      embedBatch({
        esClient,
        inferenceId: '.jina-embeddings-v5-text-small',
        inputs: ['name: alice'],
      })
    ).rejects.toThrow(/text_embedding/);
  });

  it('throws when the response length does not match the input length', async () => {
    (esClient.inference.inference as jest.Mock).mockResolvedValueOnce({
      text_embedding: [{ embedding: [0.1] }],
    });

    await expect(
      embedBatch({
        esClient,
        inferenceId: '.jina-embeddings-v5-text-small',
        inputs: ['name: alice', 'name: bob'],
      })
    ).rejects.toThrow(/expected 2 embeddings, got 1/);
  });

  it('exposes a 16-input chunk size matching the EIS Jina v5 cap (validated 2026-05-20)', () => {
    expect(INFERENCE_BATCH_SIZE).toBe(16);
  });

  it('chunks inputs into INFERENCE_BATCH_SIZE-sized calls when the total exceeds the cap', async () => {
    const total = INFERENCE_BATCH_SIZE * 2 + 1;
    const inputs = Array.from({ length: total }, (_, i) => `name: u${i}`);
    (esClient.inference.inference as jest.Mock)
      .mockResolvedValueOnce({
        text_embedding: Array.from({ length: INFERENCE_BATCH_SIZE }, (_, i) => ({
          embedding: [i],
        })),
      })
      .mockResolvedValueOnce({
        text_embedding: Array.from({ length: INFERENCE_BATCH_SIZE }, (_, i) => ({
          embedding: [INFERENCE_BATCH_SIZE + i],
        })),
      })
      .mockResolvedValueOnce({
        text_embedding: [{ embedding: [INFERENCE_BATCH_SIZE * 2] }],
      });

    const vectors = await embedBatch({
      esClient,
      inferenceId: '.jina-embeddings-v5-text-small',
      inputs,
    });

    expect(esClient.inference.inference).toHaveBeenCalledTimes(3);
    const calls = (esClient.inference.inference as jest.Mock).mock.calls;
    expect(calls[0][0].input).toHaveLength(INFERENCE_BATCH_SIZE);
    expect(calls[1][0].input).toHaveLength(INFERENCE_BATCH_SIZE);
    expect(calls[2][0].input).toHaveLength(1);
    expect(calls[0][0].input[0]).toBe('name: u0');
    expect(calls[1][0].input[0]).toBe(`name: u${INFERENCE_BATCH_SIZE}`);
    expect(calls[2][0].input[0]).toBe(`name: u${INFERENCE_BATCH_SIZE * 2}`);
    // Concatenated output preserves input order across chunks.
    expect(vectors).toHaveLength(total);
    expect(vectors[0]).toEqual([0]);
    expect(vectors[INFERENCE_BATCH_SIZE]).toEqual([INFERENCE_BATCH_SIZE]);
    expect(vectors[total - 1]).toEqual([INFERENCE_BATCH_SIZE * 2]);
  });

  it('propagates errors from the first failing chunk and does not call subsequent chunks', async () => {
    const inputs = Array.from({ length: INFERENCE_BATCH_SIZE + 5 }, (_, i) => `name: u${i}`);
    (esClient.inference.inference as jest.Mock).mockRejectedValueOnce(new Error('eis 400'));

    await expect(
      embedBatch({
        esClient,
        inferenceId: '.jina-embeddings-v5-text-small',
        inputs,
      })
    ).rejects.toThrow('eis 400');
    expect(esClient.inference.inference).toHaveBeenCalledTimes(1);
  });
});
