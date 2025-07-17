/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FormState } from 'react-hook-form';

import { i18n } from '@kbn/i18n';

import { DEFAULT_CONTEXT_DOCUMENTS } from '../../common';
import { DEFAULT_LLM_PROMPT } from '../../common/prompt';

import {
  LLMModel,
  PlaygroundForm,
  PlaygroundResponse,
  PlaygroundSavedObject,
  SavedPlaygroundForm,
  SavedPlaygroundFormFetchError,
  SavedPlaygroundFormFields,
} from '../types';

function parseSummarizationModel(
  model: PlaygroundSavedObject['summarizationModel'],
  models: LLMModel[]
): LLMModel | undefined {
  if (!model) {
    return undefined;
  }

  if (model.modelId) {
    const exactMatch = models.find(
      (llm) => llm.connectorId === model.connectorId && llm.value === model.modelId
    );
    if (exactMatch) {
      return exactMatch;
    }
  }
  return models.find((llm) => llm.connectorId === model.connectorId);
}

export function parseSavedPlayground(
  playground: PlaygroundResponse,
  models: LLMModel[]
): SavedPlaygroundForm {
  return {
    [SavedPlaygroundFormFields.name]: playground.data.name,
    [SavedPlaygroundFormFields.indices]: playground.data.indices,
    [SavedPlaygroundFormFields.queryFields]: playground.data.queryFields as {
      [index: string]: string[];
    },
    [SavedPlaygroundFormFields.elasticsearchQuery]: JSON.parse(
      playground.data.elasticsearchQueryJSON
    ) as { retriever: any }, // TODO: replace with function
    [SavedPlaygroundFormFields.userElasticsearchQuery]:
      playground.data.userElasticsearchQueryJSON ?? null,
    [SavedPlaygroundFormFields.prompt]: playground.data.prompt ?? DEFAULT_LLM_PROMPT,
    [SavedPlaygroundFormFields.citations]: playground.data.citations ?? false,
    [SavedPlaygroundFormFields.sourceFields]:
      (playground.data.context?.sourceFields as
        | {
            [index: string]: string[];
          }
        | undefined) ?? {},
    [SavedPlaygroundFormFields.docSize]:
      playground.data.context?.docSize ?? DEFAULT_CONTEXT_DOCUMENTS,
    [SavedPlaygroundFormFields.summarizationModel]: parseSummarizationModel(
      playground.data.summarizationModel,
      models
    ),
    [SavedPlaygroundFormFields.question]: '',
    [SavedPlaygroundFormFields.searchQuery]: '',
  };
}

export function fetchSavedPlaygroundError(e: unknown): SavedPlaygroundFormFetchError {
  return {
    [SavedPlaygroundFormFields.name]: '',
    [SavedPlaygroundFormFields.indices]: [],
    [SavedPlaygroundFormFields.queryFields]: {},
    [SavedPlaygroundFormFields.elasticsearchQuery]: { retriever: {} },
    [SavedPlaygroundFormFields.userElasticsearchQuery]: null,
    [SavedPlaygroundFormFields.prompt]: '',
    [SavedPlaygroundFormFields.citations]: false,
    [SavedPlaygroundFormFields.sourceFields]: {},
    [SavedPlaygroundFormFields.docSize]: 0,
    [SavedPlaygroundFormFields.summarizationModel]: undefined,
    [SavedPlaygroundFormFields.question]: '',
    [SavedPlaygroundFormFields.searchQuery]: '',
    error: e instanceof Error ? e : new Error(String(e)),
  };
}

const SavedPlaygroundFields: string[] = [
  SavedPlaygroundFormFields.name,
  SavedPlaygroundFormFields.indices,
  SavedPlaygroundFormFields.queryFields,
  SavedPlaygroundFormFields.elasticsearchQuery,
  SavedPlaygroundFormFields.userElasticsearchQuery,
  SavedPlaygroundFormFields.prompt,
  SavedPlaygroundFormFields.citations,
  SavedPlaygroundFormFields.sourceFields,
  SavedPlaygroundFormFields.docSize,
  SavedPlaygroundFormFields.summarizationModel,
];

type SavedPlaygroundDirtyFields = FormState<SavedPlaygroundForm>['dirtyFields'];
export function isSavedPlaygroundFormDirty(formDirtyFields: SavedPlaygroundDirtyFields): boolean {
  const dirtyFields = Object.entries(formDirtyFields)
    .filter(([_key, value]) => typeof value === 'boolean' && value === true)
    .map(([key]) => key);

  return SavedPlaygroundFields.some((field) => dirtyFields.includes(field));
}

const SavedPlaygroundFieldErrors: string[] = [
  SavedPlaygroundFormFields.name,
  SavedPlaygroundFormFields.indices,
  SavedPlaygroundFormFields.queryFields,
  SavedPlaygroundFormFields.elasticsearchQuery,
  SavedPlaygroundFormFields.userElasticsearchQuery,
  SavedPlaygroundFormFields.prompt,
  SavedPlaygroundFormFields.citations,
  SavedPlaygroundFormFields.sourceFields,
  SavedPlaygroundFormFields.docSize,
];

type SavedPlaygroundFormErrors = FormState<SavedPlaygroundForm>['errors'];
export function hasSavedPlaygroundFormErrors(errors: SavedPlaygroundFormErrors): boolean {
  const errorFields = Object.keys(errors);

  return SavedPlaygroundFieldErrors.some((field) => {
    return errorFields.includes(field);
  });
}

export function buildNewSavedPlaygroundFromForm(
  name: string,
  formData: PlaygroundForm
): PlaygroundSavedObject {
  const result: PlaygroundSavedObject = {
    name,
    indices: formData[SavedPlaygroundFormFields.indices],
    queryFields: formData[SavedPlaygroundFormFields.queryFields],
    elasticsearchQueryJSON: JSON.stringify(formData[SavedPlaygroundFormFields.elasticsearchQuery]),
    userElasticsearchQueryJSON:
      formData[SavedPlaygroundFormFields.userElasticsearchQuery] ?? undefined,
  };
  const summarizationModel = formData[SavedPlaygroundFormFields.summarizationModel];
  if (!summarizationModel) {
    return result;
  }
  return {
    ...result,
    prompt: formData[SavedPlaygroundFormFields.prompt],
    citations: formData[SavedPlaygroundFormFields.citations],
    context: {
      sourceFields: formData[SavedPlaygroundFormFields.sourceFields],
      docSize: formData[SavedPlaygroundFormFields.docSize],
    },
    summarizationModel: {
      connectorId: summarizationModel.connectorId,
      modelId: summarizationModel.value ?? undefined,
    },
  };
}

export function buildSavedPlaygroundFromForm(formData: SavedPlaygroundForm): PlaygroundSavedObject {
  return buildNewSavedPlaygroundFromForm(formData[SavedPlaygroundFormFields.name], formData);
}

export function validatePlaygroundName(name: string): string | null {
  const trimmedName = name.trim();
  if (!name || !trimmedName) {
    return i18n.translate('xpack.searchPlayground.savedPlayground.errors.name.required', {
      defaultMessage: 'Playground name is required',
    });
  }
  if (name.length > 100) {
    return i18n.translate('xpack.searchPlayground.savedPlayground.errors.name.tooLong', {
      defaultMessage: 'Playground name must be less than 100 characters',
    });
  }
  return null;
}
