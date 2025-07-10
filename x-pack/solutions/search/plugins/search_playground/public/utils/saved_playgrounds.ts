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
      (llm) => llm.connectorId === model.connectorId && llm.name === model.modelId
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
