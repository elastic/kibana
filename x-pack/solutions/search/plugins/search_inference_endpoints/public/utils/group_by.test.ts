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
    describe('GroupByOptions.Service', () => {
      const reducer = GroupByReducer(GroupByOptions.Service);

      it('groups endpoints by their service field', () => {
        const elasticEndpoints = InferenceEndpoints.filter((e) =>
          [
            '.anthropic-claude-3.7-sonnet-chat_completion',
            '.google-gemini-2.5-flash-chat_completion',
          ].includes(e.inference_id)
        );
        const result = elasticEndpoints.reduce(reducer, {});

        expect(Object.keys(result)).toEqual(['elastic']);
        expect(result.elastic.endpoints).toHaveLength(2);
      });

      it('accumulates multiple endpoints with the same service under one group', () => {
        const elasticsearchEndpoints = InferenceEndpoints.filter((e) =>
          ['.elser-2-elasticsearch', '.multilingual-e5-small-elasticsearch'].includes(
            e.inference_id
          )
        );
        const result = elasticsearchEndpoints.reduce(reducer, {});

        expect(Object.keys(result)).toEqual(['elasticsearch']);
        expect(result.elasticsearch.endpoints).toHaveLength(2);
      });

      it('accumulates endpoints from different services into separate keys', () => {
        const mixed = InferenceEndpoints.filter((e) =>
          [
            '.elser-2-elastic',
            '.elser-2-elasticsearch',
            'alibabacloud-endpoint-without-model-id',
          ].includes(e.inference_id)
        );
        const result = mixed.reduce(reducer, {});

        expect(Object.keys(result).sort()).toEqual([
          'alibabacloud-ai-search',
          'elastic',
          'elasticsearch',
        ]);
        expect(result.elastic.endpoints).toHaveLength(1);
        expect(result.elasticsearch.endpoints).toHaveLength(1);
        expect(result['alibabacloud-ai-search'].endpoints).toHaveLength(1);
      });

      it('uses the service string as groupId and groupLabel when the provider is not in SERVICE_PROVIDERS', () => {
        const result = InferenceEndpoints.filter(
          (e) => e.inference_id === 'hugging-face-endpoint-without-model-id'
        ).reduce(reducer, {});

        expect(result.hugging_face.groupId).toBe('hugging_face');
        expect(result.hugging_face.groupLabel).toBe('Hugging Face');
      });
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

      it('keeps stable order for groups with the same label', () => {
        const a = makeGroup('some-model', 'Some Model');
        const b = makeGroup('some-model', 'Some Model');
        expect([a, b].sort(sort)).toEqual([a, b]);
      });

      it('sorts the Elastic group before any other group', () => {
        const elastic = makeGroup(ELASTIC_GROUP_ID, 'Elastic');
        const openai = makeGroup('openai', 'OpenAI');
        const anthropic = makeGroup('anthropic', 'Anthropic');
        expect([openai, anthropic, elastic].sort(sort)).toEqual([elastic, anthropic, openai]);
      });

      it('sorts alphabetically by label when neither group is Elastic', () => {
        const anthropic = makeGroup('anthropic', 'Anthropic');
        const google = makeGroup('google', 'Google');
        const openai = makeGroup('openai', 'OpenAI');
        expect([openai, google, anthropic].sort(sort)).toEqual([anthropic, google, openai]);
      });

      it('keeps Elastic first even when other labels sort before "Elastic" alphabetically', () => {
        const elastic = makeGroup(ELASTIC_GROUP_ID, 'Elastic');
        const aardvark = makeGroup('aardvark', 'Aardvark');
        const zephyr = makeGroup('zephyr', 'Zephyr');
        expect([zephyr, aardvark, elastic].sort(sort)).toEqual([elastic, aardvark, zephyr]);
      });
    });
    describe('GroupByOptions.Service', () => {
      const sort = GroupBySort(GroupByOptions.Service);

      it('keeps stable order for groups with the same label', () => {
        const a = makeGroup('anthropic', 'Anthropic');
        const b = makeGroup('anthropic', 'Anthropic');
        expect([a, b].sort(sort)).toEqual([a, b]);
      });

      it('sorts elastic and elasticsearch before non-elastic service groups', () => {
        const elastic = makeGroup('elastic', 'Elastic');
        const elasticsearch = makeGroup('elasticsearch', 'Elasticsearch');
        const anthropic = makeGroup('anthropic', 'Anthropic');
        const openai = makeGroup('openai', 'OpenAI');
        expect([openai, anthropic, elasticsearch, elastic].sort(sort)).toEqual([
          elastic,
          elasticsearch,
          anthropic,
          openai,
        ]);
      });

      it('sorts alphabetically by label when neither group is an elastic service', () => {
        const anthropic = makeGroup('anthropic', 'Anthropic');
        const google = makeGroup('google', 'Google');
        const openai = makeGroup('openai', 'OpenAI');
        expect([openai, google, anthropic].sort(sort)).toEqual([anthropic, google, openai]);
      });

      it('keeps elastic services first even when other labels sort before "Elastic" alphabetically', () => {
        const elastic = makeGroup('elastic', 'Elastic');
        const aardvark = makeGroup('aardvark', 'Aardvark');
        const zephyr = makeGroup('zephyr', 'Zephyr');
        expect([zephyr, aardvark, elastic].sort(sort)).toEqual([elastic, aardvark, zephyr]);
      });
    });
  });
});
