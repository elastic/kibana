/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceEndpoints } from '../__mocks__/inference_endpoints';

import { type GroupedInferenceEndpointsData, GroupByOptions } from '../types';
import { GroupByReducer, GroupBySort, UNKNOWN_MODEL_ID_FALLBACK } from './group_by';
import { ELASTIC_GROUP_ID } from './known_models';

const makeGroup = (groupId: string, groupLabel: string): GroupedInferenceEndpointsData => ({
  groupId,
  groupLabel,
  endpoints: [],
});

describe('group by utils', () => {
  describe('GroupByReducer', () => {
    it('throws when grouping is not enabled', () => {
      expect(() => GroupByReducer(GroupByOptions.None)).toThrow('Grouping is not enabled');
    });

    describe('GroupByOptions.Model', () => {
      const reducer = GroupByReducer(GroupByOptions.Model);

      it('groups endpoints matching a known model group by that group id', () => {
        const anthropicEndpoints = InferenceEndpoints.filter((e) =>
          [
            '.anthropic-claude-3.7-sonnet-chat_completion',
            '.anthropic-claude-3.7-sonnet-completion',
          ].includes(e.inference_id)
        );
        const result = anthropicEndpoints.reduce(reducer, {});

        expect(Object.keys(result)).toEqual(['anthropic']);
        expect(result.anthropic.endpoints).toHaveLength(2);
        expect(result.anthropic.endpoints).toEqual(anthropicEndpoints);
      });

      it('groups Elastic-branded endpoints (jina, elser, rainbow-sprinkles, rerank) under the elastic group', () => {
        const elasticModelEndpoints = InferenceEndpoints.filter((e) =>
          [
            '.elser-2-elastic',
            '.jina-embeddings-v3',
            '.rainbow-sprinkles-elastic',
            '.rerank-v1-elasticsearch',
          ].includes(e.inference_id)
        );
        const result = elasticModelEndpoints.reduce(reducer, {});

        expect(Object.keys(result)).toEqual([ELASTIC_GROUP_ID]);
        expect(result[ELASTIC_GROUP_ID].endpoints).toHaveLength(4);
      });

      it('groups endpoints with no recognised model id by their model id directly', () => {
        const unknownModelEndpoints = InferenceEndpoints.filter((e) =>
          ['.gp-llm-v2-chat_completion', '.gp-llm-v2-completion'].includes(e.inference_id)
        );
        const result = unknownModelEndpoints.reduce(reducer, {});

        expect(Object.keys(result)).toEqual(['gp-llm-v2']);
        expect(result['gp-llm-v2'].groupLabel).toBe('gp-llm-v2');
        expect(result['gp-llm-v2'].endpoints).toHaveLength(2);
      });

      it('groups endpoints with no model id at all under the unknown model fallback', () => {
        const noModelIdEndpoints = InferenceEndpoints.filter((e) =>
          [
            'alibabacloud-endpoint-without-model-id',
            'hugging-face-endpoint-without-model-id',
          ].includes(e.inference_id)
        );
        const result = noModelIdEndpoints.reduce(reducer, {});

        expect(Object.keys(result)).toEqual([UNKNOWN_MODEL_ID_FALLBACK]);
        expect(result[UNKNOWN_MODEL_ID_FALLBACK].groupLabel).toBe('Unknown Model');
        expect(result[UNKNOWN_MODEL_ID_FALLBACK].endpoints).toHaveLength(2);
      });

      it('accumulates endpoints from different groups into separate keys', () => {
        const mixed = InferenceEndpoints.filter((e) =>
          [
            '.anthropic-claude-3.7-sonnet-chat_completion',
            '.google-gemini-2.5-flash-chat_completion',
            '.openai-gpt-4.1-chat_completion',
          ].includes(e.inference_id)
        );
        const result = mixed.reduce(reducer, {});

        expect(Object.keys(result).sort()).toEqual(['anthropic', 'google', 'openai']);
        expect(result.anthropic.endpoints).toHaveLength(1);
        expect(result.google.endpoints).toHaveLength(1);
        expect(result.openai.endpoints).toHaveLength(1);
      });
    });
  });
  describe('GroupBySort', () => {
    describe('GroupByOptions.Model', () => {
      const sort = GroupBySort(GroupByOptions.Model);

      it('returns 0 when both groups have the same label', () => {
        const a = makeGroup('some-model', 'Some Model');
        const b = makeGroup('some-model', 'Some Model');
        expect(sort(a, b)).toBe(0);
      });

      it('sorts the Elastic group before any other group', () => {
        const elastic = makeGroup(ELASTIC_GROUP_ID, 'Elastic');
        const other = makeGroup('openai', 'OpenAI');
        expect(sort(elastic, other)).toBe(-1);
        expect(sort(other, elastic)).toBe(1);
      });

      it('sorts alphabetically by label when neither group is Elastic', () => {
        const anthropic = makeGroup('anthropic', 'Anthropic');
        const openai = makeGroup('openai', 'OpenAI');
        expect(sort(anthropic, openai)).toBeLessThan(0);
        expect(sort(openai, anthropic)).toBeGreaterThan(0);
      });

      it('keeps Elastic first even when compared with a label that sorts before "Elastic" alphabetically', () => {
        const elastic = makeGroup(ELASTIC_GROUP_ID, 'Elastic');
        const aardvark = makeGroup('aardvark', 'Aardvark');
        expect(sort(elastic, aardvark)).toBe(-1);
        expect(sort(aardvark, elastic)).toBe(1);
      });
    });

    describe('GroupByOptions.None (default)', () => {
      const sort = GroupBySort(GroupByOptions.None);

      it('returns 0 when both groups have the same label', () => {
        const a = makeGroup('model-a', 'Model A');
        const b = makeGroup('model-a', 'Model A');
        expect(sort(a, b)).toBe(0);
      });

      it('sorts alphabetically by label in ascending order', () => {
        const alpha = makeGroup('alpha', 'Alpha');
        const beta = makeGroup('beta', 'Beta');
        expect(sort(alpha, beta)).toBeLessThan(0);
        expect(sort(beta, alpha)).toBeGreaterThan(0);
      });

      it('does NOT give Elastic special priority', () => {
        const elastic = makeGroup(ELASTIC_GROUP_ID, 'Elastic');
        const aardvark = makeGroup('aardvark', 'Aardvark');
        // 'Elastic' > 'Aardvark' alphabetically, so elastic should sort after
        expect(sort(elastic, aardvark)).toBeGreaterThan(0);
        expect(sort(aardvark, elastic)).toBeLessThan(0);
      });
    });
  });
});
