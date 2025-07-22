/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { UnsavedFormProvider, LOCAL_STORAGE_KEY } from './unsaved_form_provider';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';
import { useLLMsModels } from '../hooks/use_llms_models';
import * as ReactHookForm from 'react-hook-form';
import { PlaygroundForm, PlaygroundFormFields } from '../types';
import { useSearchParams } from 'react-router-dom-v5-compat';

jest.mock('../hooks/use_load_fields_by_indices');
jest.mock('../hooks/use_llms_models');
jest.mock('react-router-dom-v5-compat', () => ({
  useSearchParams: jest.fn(() => [{ get: jest.fn() }]),
}));
jest.mock('../hooks/use_indices_validation', () => ({
  useIndicesValidation: jest.fn((indices) => ({ isValidated: true, validIndices: indices })),
}));
jest.mock('@kbn/react-hooks', () => ({
  useDebounceFn: (fn: any) => ({ run: fn }),
}));

let formHookSpy: jest.SpyInstance;

const mockUseLoadFieldsByIndices = useLoadFieldsByIndices as jest.Mock;
const mockUseLLMsModels = useLLMsModels as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})() as Storage;

const DEFAULT_FORM_STATE: Partial<PlaygroundForm> = {
  doc_size: 3,
  prompt: 'You are an assistant for question-answering tasks.',
  source_fields: {},
  search_query: '',
  indices: [],
  summarization_model: undefined,
  user_elasticsearch_query: null,
};

describe('UnsavedFormProvider', () => {
  beforeEach(() => {
    formHookSpy = jest.spyOn(ReactHookForm, 'useForm');
    mockUseLLMsModels.mockReturnValue([]);
    mockUseLoadFieldsByIndices.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders the form provider with initial values, no default model', async () => {
    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues()).toEqual(DEFAULT_FORM_STATE);
    });
  });

  it('sets the default summarization model with models available', async () => {
    const mockModels = [
      { id: 'model1', name: 'Model 1', disabled: false },
      { id: 'model2', name: 'Model 2', disabled: true },
    ];

    mockUseLLMsModels.mockReturnValueOnce(mockModels);

    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    await waitFor(() => {
      expect(mockUseLoadFieldsByIndices).toHaveBeenCalled();
      const defaultModel = mockModels.find((model) => !model.disabled);
      const { getValues } = formHookSpy.mock.results[0].value;

      expect(getValues(PlaygroundFormFields.summarizationModel)).toEqual(defaultModel);
    });
  });

  it('does not set a disabled model as the default summarization model', async () => {
    const modelsWithAllDisabled = [
      { id: 'model1', name: 'Model 1', disabled: true },
      { id: 'model2', name: 'Model 2', disabled: true },
    ];

    mockUseLLMsModels.mockReturnValueOnce(modelsWithAllDisabled);

    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    await waitFor(() => {
      expect(mockUseLoadFieldsByIndices).toHaveBeenCalled();
    });

    expect(
      formHookSpy.mock.results[0].value.getValues(PlaygroundFormFields.summarizationModel)
    ).toBeUndefined();
  });

  it('saves form state to localStorage', async () => {
    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    const { setValue } = formHookSpy.mock.results[0].value;

    act(() => {
      setValue(PlaygroundFormFields.prompt, 'New prompt');
      // omit question from the session state
      setValue(PlaygroundFormFields.question, 'dont save me');
    });

    await waitFor(() => {
      expect(localStorageMock.getItem(LOCAL_STORAGE_KEY)).toEqual(
        JSON.stringify({
          prompt: 'New prompt',
          doc_size: 3,
          source_fields: {},
          indices: [],
          summarization_model: undefined,
          user_elasticsearch_query: null,
        })
      );
    });
  });

  it('loads form state from localStorage', async () => {
    localStorageMock.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: [],
        summarization_model: undefined,
      })
    );

    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues()).toEqual({
        ...DEFAULT_FORM_STATE,
        prompt: 'Loaded prompt',
      });
    });
  });

  it('overrides the session model to the default when not found in list', async () => {
    const mockModels = [
      { id: 'model1', name: 'Model 1', disabled: false },
      { id: 'model2', name: 'Model 2', disabled: true },
    ];

    mockUseLLMsModels.mockReturnValueOnce(mockModels);

    localStorageMock.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: [],
        summarization_model: { id: 'non-exist-model', name: 'Model 1', disabled: false },
      })
    );

    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues().summarization_model).toEqual({
        id: 'model1',
        name: 'Model 1',
        disabled: false,
      });
    });
  });

  it('updates indices from search params', async () => {
    expect.assertions(1);
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.get = jest.fn().mockReturnValue('new-index');
    mockUseSearchParams.mockReturnValue([mockSearchParams]);

    localStorageMock.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: ['old-index'],
        summarization_model: undefined,
      })
    );

    render(
      <UnsavedFormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </UnsavedFormProvider>
    );

    await act(async () => {
      const { getValues } = formHookSpy.mock.results[0].value;

      await waitFor(() => {
        expect(getValues(PlaygroundFormFields.indices)).toEqual(['new-index']);
      });
    });
  });
});
