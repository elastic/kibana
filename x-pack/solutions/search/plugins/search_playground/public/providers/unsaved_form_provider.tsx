/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormProvider as ReactHookFormProvider, useForm, UseFormGetValues } from 'react-hook-form';
import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useDebounceFn } from '@kbn/react-hooks';
import { DEFAULT_CONTEXT_DOCUMENTS } from '../../common';
import { DEFAULT_LLM_PROMPT } from '../../common/prompt';
import { useIndicesValidation } from '../hooks/use_indices_validation';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';
import { PlaygroundForm, PlaygroundFormFields } from '../types';
import { useLLMsModels } from '../hooks/use_llms_models';
import { playgroundFormResolver } from '../utils/playground_form_resolver';

type PartialPlaygroundForm = Partial<PlaygroundForm>;
export const LOCAL_STORAGE_KEY = 'search_playground_session';
export const LOCAL_STORAGE_DEBOUNCE_OPTIONS = { wait: 100, maxWait: 500 };

const DEFAULT_FORM_VALUES: PartialPlaygroundForm = {
  prompt: DEFAULT_LLM_PROMPT,
  doc_size: DEFAULT_CONTEXT_DOCUMENTS,
  source_fields: {},
  indices: [],
  summarization_model: undefined,
  [PlaygroundFormFields.userElasticsearchQuery]: null,
};

const getLocalSession = (storage: Storage): PartialPlaygroundForm => {
  try {
    const localSessionJSON = storage.getItem(LOCAL_STORAGE_KEY);
    const sessionState = localSessionJSON ? JSON.parse(localSessionJSON) : {};

    return {
      ...DEFAULT_FORM_VALUES,
      ...sessionState,
    };
  } catch (e) {
    return DEFAULT_FORM_VALUES;
  }
};

const setLocalSession = (getValues: UseFormGetValues<PlaygroundForm>, storage: Storage) => {
  const formState = getValues();
  // omit question and search_query from the session state
  const { question, search_query: _searchQuery, ...state } = formState;

  storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

interface UnsavedFormProviderProps {
  storage?: Storage;
}

export const UnsavedFormProvider: React.FC<React.PropsWithChildren<UnsavedFormProviderProps>> = ({
  children,
  storage = localStorage,
}) => {
  const models = useLLMsModels();
  const [searchParams] = useSearchParams();
  const defaultIndex = useMemo(() => {
    const index = searchParams.get('default-index');

    return index ? [index] : null;
  }, [searchParams]);
  const sessionState: PartialPlaygroundForm = useMemo(() => getLocalSession(storage), [storage]);
  const form = useForm<PlaygroundForm>({
    defaultValues: {
      ...sessionState,
      indices: [],
      search_query: '',
    },
    resolver: playgroundFormResolver,
    reValidateMode: 'onChange',
  });
  const { isValidated: isValidatedIndices, validIndices } = useIndicesValidation(
    defaultIndex || sessionState.indices || []
  );
  useLoadFieldsByIndices({
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
  });

  const setLocalSessionDebounce = useDebounceFn(setLocalSession, LOCAL_STORAGE_DEBOUNCE_OPTIONS);
  useEffect(() => {
    const subscription = form.watch((_values) =>
      setLocalSessionDebounce.run(form.getValues, storage)
    );
    return () => subscription.unsubscribe();
  }, [form, storage, setLocalSessionDebounce]);

  useEffect(() => {
    if (models.length === 0) return; // don't continue if there are no models
    const defaultModel = models.find((model) => !model.disabled);
    const currentModel = form.getValues(PlaygroundFormFields.summarizationModel);

    if (defaultModel && (!currentModel || !models.find((model) => currentModel.id === model.id))) {
      form.setValue(PlaygroundFormFields.summarizationModel, defaultModel);
    }
  }, [form, models]);

  useEffect(() => {
    if (isValidatedIndices) {
      form.setValue(PlaygroundFormFields.indices, validIndices);
      form.trigger();
    }
  }, [form, isValidatedIndices, validIndices]);

  return <ReactHookFormProvider {...form}>{children}</ReactHookFormProvider>;
};
