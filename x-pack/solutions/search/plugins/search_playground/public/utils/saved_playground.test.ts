/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_CONTEXT_DOCUMENTS } from '../../common';
import { DEFAULT_LLM_PROMPT } from '../../common/prompt';
import {
  LLMModel,
  PlaygroundForm,
  PlaygroundResponse,
  SavedPlaygroundForm,
  SavedPlaygroundFormFields,
} from '../types';
import {
  parseSavedPlayground,
  fetchSavedPlaygroundError,
  isSavedPlaygroundFormDirty,
  hasSavedPlaygroundFormErrors,
  buildNewSavedPlaygroundFromForm,
  buildSavedPlaygroundFromForm,
  validatePlaygroundName,
} from './saved_playgrounds';

// Mock data
const mockLLMModels: LLMModel[] = [
  {
    id: 'openai-gpt-3.5',
    name: 'GPT 3.5',
    value: 'gpt-3.5-turbo',
    connectorId: 'openai-connector-1',
    connectorName: 'OpenAI Connector',
    connectorType: 'openai',
    icon: 'openai',
    disabled: false,
    promptTokenLimit: 4096,
  },
  {
    id: 'openai-gpt-4',
    name: 'GPT 4',
    value: 'gpt-4',
    connectorId: 'openai-connector-2',
    connectorName: 'OpenAI GPT-4 Connector',
    connectorType: 'openai',
    icon: 'openai',
    disabled: false,
    promptTokenLimit: 8192,
  },
];

const mockPlaygroundResponse: PlaygroundResponse = {
  _meta: {
    id: 'test-playground-id',
    createdAt: '2023-01-01T00:00:00.000Z',
    createdBy: 'test-user',
    updatedAt: '2023-01-02T00:00:00.000Z',
    updatedBy: 'test-user',
  },
  data: {
    name: 'Test Playground',
    indices: ['index1', 'index2'],
    queryFields: {
      index1: ['field1', 'field2'],
      index2: ['field3'],
    },
    elasticsearchQueryJSON: JSON.stringify({
      retriever: {
        standard: {
          query: { match_all: {} },
        },
      },
    }),
    userElasticsearchQueryJSON: '{"query": { "match": { "fields": ["field1"],"query": "{query}"}}}',
    prompt: 'Custom prompt',
    citations: true,
    context: {
      sourceFields: {
        index1: ['source1', 'source2'],
      },
      docSize: 5,
    },
    summarizationModel: {
      connectorId: 'openai-connector-1',
      modelId: 'gpt-3.5-turbo',
    },
  },
};

const mockPlaygroundForm: PlaygroundForm = {
  [SavedPlaygroundFormFields.question]: 'test question',
  [SavedPlaygroundFormFields.prompt]: 'test prompt',
  [SavedPlaygroundFormFields.citations]: false,
  [SavedPlaygroundFormFields.indices]: ['test-index'],
  [SavedPlaygroundFormFields.summarizationModel]: mockLLMModels[0],
  [SavedPlaygroundFormFields.elasticsearchQuery]: { retriever: { test: 'query' } },
  [SavedPlaygroundFormFields.sourceFields]: { 'test-index': ['field1'] },
  [SavedPlaygroundFormFields.docSize]: 3,
  [SavedPlaygroundFormFields.queryFields]: { 'test-index': ['query-field'] },
  [SavedPlaygroundFormFields.searchQuery]: 'search query',
  [SavedPlaygroundFormFields.userElasticsearchQuery]:
    '{"query": { "match": { "fields": ["field1"],"query": "{query}"}}}',
};

const mockSavedPlaygroundForm: SavedPlaygroundForm = {
  ...mockPlaygroundForm,
  [SavedPlaygroundFormFields.name]: 'Test Saved Playground',
};

describe('saved_playgrounds utils', () => {
  describe('parseSavedPlayground', () => {
    it('should parse a playground response with all fields', () => {
      const result = parseSavedPlayground(mockPlaygroundResponse, mockLLMModels);

      expect(result).toEqual({
        [SavedPlaygroundFormFields.name]: 'Test Playground',
        [SavedPlaygroundFormFields.indices]: ['index1', 'index2'],
        [SavedPlaygroundFormFields.queryFields]: {
          index1: ['field1', 'field2'],
          index2: ['field3'],
        },
        [SavedPlaygroundFormFields.elasticsearchQuery]: {
          retriever: {
            standard: {
              query: { match_all: {} },
            },
          },
        },
        [SavedPlaygroundFormFields.userElasticsearchQuery]:
          '{"query": { "match": { "fields": ["field1"],"query": "{query}"}}}',
        [SavedPlaygroundFormFields.prompt]: 'Custom prompt',
        [SavedPlaygroundFormFields.citations]: true,
        [SavedPlaygroundFormFields.sourceFields]: {
          index1: ['source1', 'source2'],
        },
        [SavedPlaygroundFormFields.docSize]: 5,
        [SavedPlaygroundFormFields.summarizationModel]: mockLLMModels[0],
        [SavedPlaygroundFormFields.question]: '',
        [SavedPlaygroundFormFields.searchQuery]: '',
      });
    });

    it('should use default values when fields are missing', () => {
      const minimalResponse: PlaygroundResponse = {
        _meta: { id: 'test' },
        data: {
          name: 'Minimal Playground',
          indices: ['index1'],
          queryFields: {},
          elasticsearchQueryJSON: JSON.stringify({ retriever: {} }),
        },
      };

      const result = parseSavedPlayground(minimalResponse, mockLLMModels);

      expect(result[SavedPlaygroundFormFields.prompt]).toBe(DEFAULT_LLM_PROMPT);
      expect(result[SavedPlaygroundFormFields.citations]).toBe(false);
      expect(result[SavedPlaygroundFormFields.sourceFields]).toEqual({});
      expect(result[SavedPlaygroundFormFields.docSize]).toBe(DEFAULT_CONTEXT_DOCUMENTS);
      expect(result[SavedPlaygroundFormFields.summarizationModel]).toBeUndefined();
      expect(result[SavedPlaygroundFormFields.userElasticsearchQuery]).toBeNull();
    });

    it('should find summarization model by exact match', () => {
      const result = parseSavedPlayground(mockPlaygroundResponse, mockLLMModels);
      expect(result[SavedPlaygroundFormFields.summarizationModel]).toBe(mockLLMModels[0]);
    });

    it('should find summarization model by connector when model ID does not match', () => {
      const responseWithUnknownModel: PlaygroundResponse = {
        ...mockPlaygroundResponse,
        data: {
          ...mockPlaygroundResponse.data,
          summarizationModel: {
            connectorId: 'openai-connector-1',
            modelId: 'unknown-model',
          },
        },
      };

      const result = parseSavedPlayground(responseWithUnknownModel, mockLLMModels);
      expect(result[SavedPlaygroundFormFields.summarizationModel]).toBe(mockLLMModels[0]);
    });

    it('should return undefined summarization model when connector not found', () => {
      const responseWithUnknownConnector: PlaygroundResponse = {
        ...mockPlaygroundResponse,
        data: {
          ...mockPlaygroundResponse.data,
          summarizationModel: {
            connectorId: 'unknown-connector',
            modelId: 'gpt-3.5-turbo',
          },
        },
      };

      const result = parseSavedPlayground(responseWithUnknownConnector, mockLLMModels);
      expect(result[SavedPlaygroundFormFields.summarizationModel]).toBeUndefined();
    });
  });

  describe('fetchSavedPlaygroundError', () => {
    it('should return error form with Error object', () => {
      const error = new Error('Test error');
      const result = fetchSavedPlaygroundError(error);

      expect(result.error).toBe(error);
      expect(result[SavedPlaygroundFormFields.name]).toBe('');
      expect(result[SavedPlaygroundFormFields.indices]).toEqual([]);
      expect(result[SavedPlaygroundFormFields.queryFields]).toEqual({});
      expect(result[SavedPlaygroundFormFields.elasticsearchQuery]).toEqual({ retriever: {} });
      expect(result[SavedPlaygroundFormFields.userElasticsearchQuery]).toBeNull();
      expect(result[SavedPlaygroundFormFields.prompt]).toBe('');
      expect(result[SavedPlaygroundFormFields.citations]).toBe(false);
      expect(result[SavedPlaygroundFormFields.sourceFields]).toEqual({});
      expect(result[SavedPlaygroundFormFields.docSize]).toBe(0);
      expect(result[SavedPlaygroundFormFields.summarizationModel]).toBeUndefined();
      expect(result[SavedPlaygroundFormFields.question]).toBe('');
      expect(result[SavedPlaygroundFormFields.searchQuery]).toBe('');
    });

    it('should convert non-Error objects to Error', () => {
      const errorString = 'String error';
      const result = fetchSavedPlaygroundError(errorString);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('String error');
    });

    it('should handle undefined error', () => {
      const result = fetchSavedPlaygroundError(undefined);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('undefined');
    });
  });

  describe('isSavedPlaygroundFormDirty', () => {
    it('should return true when tracked fields are dirty', () => {
      const dirtyFields = {
        [SavedPlaygroundFormFields.name]: true,
        [SavedPlaygroundFormFields.question]: false, // question is not tracked
      };

      const result = isSavedPlaygroundFormDirty(dirtyFields);
      expect(result).toBe(true);
    });

    it('should return false when no tracked fields are dirty', () => {
      const dirtyFields = {
        [SavedPlaygroundFormFields.question]: true, // question is not tracked
        [SavedPlaygroundFormFields.searchQuery]: true, // searchQuery is not tracked
      };

      const result = isSavedPlaygroundFormDirty(dirtyFields);
      expect(result).toBe(false);
    });

    it('should return false when no fields are dirty', () => {
      const dirtyFields = {};

      const result = isSavedPlaygroundFormDirty(dirtyFields);
      expect(result).toBe(false);
    });

    it('should handle non-boolean dirty field values', () => {
      const dirtyFields = {
        [SavedPlaygroundFormFields.name]: {} as any, // non-boolean value
      };

      const result = isSavedPlaygroundFormDirty(dirtyFields);
      expect(result).toBe(false);
    });
  });

  describe('hasSavedPlaygroundFormErrors', () => {
    it('should return true when tracked fields have errors', () => {
      const errors = {
        [SavedPlaygroundFormFields.name]: {
          type: 'required',
          message: 'Name is required',
        },
      };

      const result = hasSavedPlaygroundFormErrors(errors);
      expect(result).toBe(true);
    });

    it('should return false when only non-tracked fields have errors', () => {
      const errors = {
        [SavedPlaygroundFormFields.question]: {
          type: 'required',
          message: 'Question is required',
        },
        [SavedPlaygroundFormFields.searchQuery]: {
          type: 'required',
          message: 'Search query error',
        },
      };

      const result = hasSavedPlaygroundFormErrors(errors);
      expect(result).toBe(false);
    });

    it('should return false when no errors exist', () => {
      const errors = {};

      const result = hasSavedPlaygroundFormErrors(errors);
      expect(result).toBe(false);
    });

    it('should return true for multiple error fields', () => {
      const errors = {
        [SavedPlaygroundFormFields.name]: {
          type: 'required',
          message: 'Name error',
        },
        [SavedPlaygroundFormFields.indices]: {
          type: 'required',
          message: 'Indices error',
        },
        [SavedPlaygroundFormFields.question]: {
          type: 'required',
          message: 'Question error',
        }, // not tracked
      };

      const result = hasSavedPlaygroundFormErrors(errors);
      expect(result).toBe(true);
    });
  });

  describe('buildNewSavedPlaygroundFromForm', () => {
    it('should build saved playground object without summarization model', () => {
      const formDataWithoutModel: PlaygroundForm = {
        ...mockPlaygroundForm,
        [SavedPlaygroundFormFields.summarizationModel]: undefined,
      };

      const result = buildNewSavedPlaygroundFromForm('Test Name', formDataWithoutModel);

      expect(result).toEqual({
        name: 'Test Name',
        indices: ['test-index'],
        queryFields: { 'test-index': ['query-field'] },
        elasticsearchQueryJSON: JSON.stringify({ retriever: { test: 'query' } }),
        userElasticsearchQueryJSON:
          '{"query": { "match": { "fields": ["field1"],"query": "{query}"}}}',
      });
    });

    it('should build saved playground object with summarization model', () => {
      const result = buildNewSavedPlaygroundFromForm('Test Name', mockPlaygroundForm);

      expect(result).toEqual({
        name: 'Test Name',
        indices: ['test-index'],
        queryFields: { 'test-index': ['query-field'] },
        elasticsearchQueryJSON: JSON.stringify({ retriever: { test: 'query' } }),
        userElasticsearchQueryJSON:
          '{"query": { "match": { "fields": ["field1"],"query": "{query}"}}}',
        prompt: 'test prompt',
        citations: false,
        context: {
          sourceFields: { 'test-index': ['field1'] },
          docSize: 3,
        },
        summarizationModel: {
          connectorId: 'openai-connector-1',
          modelId: 'gpt-3.5-turbo',
        },
      });
    });

    it('should handle null userElasticsearchQuery', () => {
      const formDataWithNullQuery: PlaygroundForm = {
        ...mockPlaygroundForm,
        [SavedPlaygroundFormFields.userElasticsearchQuery]: null,
      };

      const result = buildNewSavedPlaygroundFromForm('Test Name', formDataWithNullQuery);

      expect(result.userElasticsearchQueryJSON).toBeUndefined();
    });

    it('should handle summarization model without value', () => {
      const modelWithoutValue: LLMModel = {
        ...mockLLMModels[0],
        value: undefined,
      };
      const formDataWithModelNoValue: PlaygroundForm = {
        ...mockPlaygroundForm,
        [SavedPlaygroundFormFields.summarizationModel]: modelWithoutValue,
      };

      const result = buildNewSavedPlaygroundFromForm('Test Name', formDataWithModelNoValue);

      expect(result.summarizationModel).toEqual({
        connectorId: 'openai-connector-1',
        modelId: undefined,
      });
    });
  });

  describe('buildSavedPlaygroundFromForm', () => {
    it('should build saved playground using name from form data', () => {
      const result = buildSavedPlaygroundFromForm(mockSavedPlaygroundForm);

      expect(result.name).toBe('Test Saved Playground');
      expect(result.indices).toEqual(['test-index']);
      expect(result.queryFields).toEqual({ 'test-index': ['query-field'] });
    });
  });

  describe('validatePlaygroundName', () => {
    it('should return undefined for valid names', () => {
      expect(validatePlaygroundName('Valid Name')).toBeNull();
      expect(validatePlaygroundName('A')).toBeNull();
      expect(validatePlaygroundName('a'.repeat(100))).toBeNull(); // exactly 100 chars
    });

    it('should return error for empty name', () => {
      expect(validatePlaygroundName('')).toBe('Playground name is required');
    });

    it('should return error for names longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(validatePlaygroundName(longName)).toBe(
        'Playground name must be less than 100 characters'
      );
    });

    it('should handle whitespace-only names as empty', () => {
      expect(validatePlaygroundName('   ')).toBe('Playground name is required');
    });
  });
});
