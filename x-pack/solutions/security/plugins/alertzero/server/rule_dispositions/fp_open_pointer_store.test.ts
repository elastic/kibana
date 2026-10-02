/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { FP_OPEN_POINTER_KI_TYPE, RULE_DISPOSITIONS_AI_INDEX_DEST } from './constants';
import { createFpOpenPointerStore } from './fp_open_pointer_store';

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    meta: {} as never,
    warnings: null,
  });

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const store = createFpOpenPointerStore({ esClient, spaceId: 'space-a' });
  return { esClient, store };
};

describe('createFpOpenPointerStore', () => {
  describe('get', () => {
    it('reads the pointer of the rule in this space by its deterministic id', async () => {
      const { esClient, store } = setup();
      esClient.get.mockResolvedValue({
        _index: RULE_DISPOSITIONS_AI_INDEX_DEST,
        _id: 'space-a:alert-triage-fp-open:rule-1',
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: {
          attributes: { conversation_id: 'conv-1', review_execution_id: 'exec-1' },
          updated_at: '2026-09-30T10:00:00.000Z',
        },
      });

      await expect(store.get('rule-1')).resolves.toEqual({
        pointer: {
          ruleId: 'rule-1',
          conversationId: 'conv-1',
          reviewExecutionId: 'exec-1',
          updatedAt: '2026-09-30T10:00:00.000Z',
        },
        seqNo: 4,
        primaryTerm: 2,
      });
      expect(esClient.get).toHaveBeenCalledWith(
        { index: RULE_DISPOSITIONS_AI_INDEX_DEST, id: 'space-a:alert-triage-fp-open:rule-1' },
        expect.anything()
      );
    });

    it('reports no pointer when the document or the index does not exist', async () => {
      const { esClient, store } = setup();
      esClient.get.mockResolvedValueOnce({ _index: '', _id: '', found: false });
      esClient.get.mockRejectedValueOnce(responseError(404));

      await expect(store.get('rule-1')).resolves.toBeUndefined();
      await expect(store.get('rule-1')).resolves.toBeUndefined();
    });

    it('does not swallow other errors', async () => {
      const { esClient, store } = setup();
      esClient.get.mockRejectedValue(responseError(403));

      await expect(store.get('rule-1')).rejects.toThrow();
    });
  });

  describe('write', () => {
    it('creates the pointer only if none exists yet', async () => {
      const { esClient, store } = setup();

      await expect(store.write({ ruleId: 'rule-1', conversationId: 'conv-1' })).resolves.toBe(
        'written'
      );
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: RULE_DISPOSITIONS_AI_INDEX_DEST,
          id: 'space-a:alert-triage-fp-open:rule-1',
          op_type: 'create',
          document: expect.objectContaining({
            type: FP_OPEN_POINTER_KI_TYPE,
            attributes: {
              rule_id: 'rule-1',
              space_id: 'space-a',
              conversation_id: 'conv-1',
              status: 'open',
            },
          }),
        }),
        expect.anything()
      );
    });

    it('replaces exactly the version it read', async () => {
      const { esClient, store } = setup();

      await store.write(
        { ruleId: 'rule-1', conversationId: 'conv-2', reviewExecutionId: 'exec-2' },
        { seqNo: 4, primaryTerm: 2 }
      );
      const [params] = esClient.index.mock.calls[0];
      expect(params).toEqual(expect.objectContaining({ if_seq_no: 4, if_primary_term: 2 }));
      expect(params).not.toHaveProperty('op_type');
    });

    it('reports a lost race as a conflict instead of throwing', async () => {
      const { esClient, store } = setup();
      esClient.index.mockRejectedValue(responseError(409));

      await expect(store.write({ ruleId: 'rule-1', conversationId: 'conv-1' })).resolves.toBe(
        'conflict'
      );
    });

    it('does not swallow other errors', async () => {
      const { esClient, store } = setup();
      esClient.index.mockRejectedValue(responseError(403));

      await expect(store.write({ ruleId: 'rule-1', conversationId: 'conv-1' })).rejects.toThrow();
    });
  });

  describe('release', () => {
    it('deletes exactly the version it read', async () => {
      const { esClient, store } = setup();

      await expect(store.release('rule-1', { seqNo: 4, primaryTerm: 2 })).resolves.toBe('released');
      expect(esClient.delete).toHaveBeenCalledWith(
        {
          index: RULE_DISPOSITIONS_AI_INDEX_DEST,
          id: 'space-a:alert-triage-fp-open:rule-1',
          if_seq_no: 4,
          if_primary_term: 2,
        },
        expect.anything()
      );
    });

    it('leaves a pointer another writer replaced in the meantime', async () => {
      const { esClient, store } = setup();
      esClient.delete.mockRejectedValue(responseError(409));

      await expect(store.release('rule-1', { seqNo: 4, primaryTerm: 2 })).resolves.toBe('conflict');
    });

    it('treats a pointer that is already gone as released', async () => {
      const { esClient, store } = setup();
      esClient.delete.mockRejectedValue(responseError(404));

      await expect(store.release('rule-1', { seqNo: 4, primaryTerm: 2 })).resolves.toBe('released');
    });

    it('does not swallow other errors', async () => {
      const { esClient, store } = setup();
      esClient.delete.mockRejectedValue(responseError(403));

      await expect(store.release('rule-1', { seqNo: 4, primaryTerm: 2 })).rejects.toThrow();
    });
  });
});
