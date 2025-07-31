/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolverOptions } from 'react-hook-form';
import {
  LLMs,
  PlaygroundForm,
  PlaygroundFormFields,
  SavedPlaygroundForm,
  SavedPlaygroundFormFields,
} from '../types';
import { playgroundFormResolver, savedPlaygroundFormResolver } from './playground_form_resolver';

describe('Form Resolvers', () => {
  const resolverContext = { http: {} };
  const mockLLM = {
    connectorId: 'connectorId1',
    connectorName: 'OpenAI Connector',
    connectorType: LLMs.openai,
    disabled: false,
    icon: expect.any(String),
    id: 'connectorId1OpenAI GPT-4o ',
    name: 'OpenAI GPT-4o ',
    showConnectorName: false,
    value: 'gpt-4o',
    promptTokenLimit: 128000,
  };
  const validPlaygroundForm: PlaygroundForm = {
    [PlaygroundFormFields.indices]: ['unitTest'],
    [PlaygroundFormFields.queryFields]: {
      unitTest: ['field1', 'field2'],
    },
    [PlaygroundFormFields.sourceFields]: {
      unitTest: ['field1', 'field2'],
    },
    [PlaygroundFormFields.elasticsearchQuery]: { retriever: {} },
    [PlaygroundFormFields.userElasticsearchQuery]: null,
    [PlaygroundFormFields.prompt]: 'This is a prompt',
    [PlaygroundFormFields.citations]: false,
    [PlaygroundFormFields.docSize]: 3,
    [PlaygroundFormFields.summarizationModel]: { ...mockLLM },
    [PlaygroundFormFields.question]: 'Some question',
    [PlaygroundFormFields.searchQuery]: 'search',
  };

  describe('playgroundFormResolver', () => {
    const resolverOptions: ResolverOptions<PlaygroundForm> = {
      criteriaMode: 'all',
      fields: {},
      shouldUseNativeValidation: false,
    };
    it('returns values when there are no errors', async () => {
      expect(
        playgroundFormResolver(validPlaygroundForm, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: validPlaygroundForm,
        errors: {},
      });
    });
    it('validates user Elasticsearch query', async () => {
      const values = {
        ...validPlaygroundForm,
        [PlaygroundFormFields.userElasticsearchQuery]: 'invalid query',
      };
      expect(
        playgroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.userElasticsearchQuery]: {
            type: 'value',
            message: expect.any(String),
          },
        },
      });
    });
    it('validates summarizationModel', async () => {
      const values = {
        ...validPlaygroundForm,
        [PlaygroundFormFields.summarizationModel]: undefined,
      };
      expect(
        playgroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.summarizationModel]: {
            type: 'required',
          },
        },
      });
    });
    it('validates prompt', async () => {
      const values = {
        ...validPlaygroundForm,
        [PlaygroundFormFields.prompt]: '',
      };
      expect(
        playgroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.prompt]: {
            type: 'required',
          },
        },
      });

      values[PlaygroundFormFields.prompt] = '     ';
      expect(
        playgroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.prompt]: {
            type: 'required',
          },
        },
      });
    });
    it('validates question', async () => {
      const values = {
        ...validPlaygroundForm,
        [PlaygroundFormFields.question]: '',
      };
      expect(
        playgroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.question]: {
            type: 'required',
          },
        },
      });

      values[PlaygroundFormFields.question] = '     ';
      expect(
        playgroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.question]: {
            type: 'required',
          },
        },
      });
    });
  });
  describe('savedPlaygroundFormResolver', () => {
    const resolverOptions: ResolverOptions<SavedPlaygroundForm> = {
      criteriaMode: 'all',
      fields: {},
      shouldUseNativeValidation: false,
    };
    const validSavedPlaygroundForm: SavedPlaygroundForm = {
      ...validPlaygroundForm,
      [SavedPlaygroundFormFields.name]: 'my saved playground',
    };

    it('returns values when there are no errors', async () => {
      expect(
        savedPlaygroundFormResolver(validSavedPlaygroundForm, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: validSavedPlaygroundForm,
        errors: {},
      });
    });
    it('validates user Elasticsearch query', async () => {
      const values = {
        ...validSavedPlaygroundForm,
        [PlaygroundFormFields.userElasticsearchQuery]: 'invalid query',
      };
      expect(
        savedPlaygroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.userElasticsearchQuery]: {
            type: 'value',
            message: expect.any(String),
          },
        },
      });
    });

    it('validates summarizationModel', async () => {
      const values = {
        ...validSavedPlaygroundForm,
        [PlaygroundFormFields.summarizationModel]: undefined,
      };
      expect(
        savedPlaygroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.summarizationModel]: {
            type: 'required',
          },
        },
      });
    });
    it('validates prompt', async () => {
      const values = {
        ...validSavedPlaygroundForm,
        [PlaygroundFormFields.prompt]: '',
      };
      expect(
        savedPlaygroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.prompt]: {
            type: 'required',
          },
        },
      });

      values[PlaygroundFormFields.prompt] = '     ';
      expect(
        savedPlaygroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.prompt]: {
            type: 'required',
          },
        },
      });
    });
    it('validates question', async () => {
      const values = {
        ...validSavedPlaygroundForm,
        [PlaygroundFormFields.question]: '',
      };
      expect(
        savedPlaygroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.question]: {
            type: 'required',
          },
        },
      });

      values[PlaygroundFormFields.question] = '     ';
      expect(
        savedPlaygroundFormResolver(values, resolverContext, resolverOptions)
      ).resolves.toStrictEqual({
        values: {},
        errors: {
          [PlaygroundFormFields.question]: {
            type: 'required',
          },
        },
      });
    });
  });
});
