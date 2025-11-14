/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SyntheticsServiceDeleteSnippetResponseType,
  SyntheticsServiceDeleteSnippetSuccessResponseType,
  SyntheticsServiceGetSnippetsResponseType,
  SyntheticsServiceGetSnippetsSuccessResponseType,
  SyntheticsServicePostSnippetResponseType,
  SyntheticsServicePostSnippetSuccessResponseType,
  SyntheticsServiceSnippetType,
  SyntheticsServiceSnippetWithIdType,
} from '../../../../../../common/runtime_types/synthetics_service_snippet';
import { apiService } from '../../../../../utils/api_service';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';

export const getSnippets = async () => {
  const response = (await apiService.get(
    SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS
  )) as SyntheticsServiceGetSnippetsResponseType;

  if (response.error) {
    throw new Error(response.message);
  }
  return response as SyntheticsServiceGetSnippetsSuccessResponseType;
};

export const postSnippet = async (payload: { snippet: SyntheticsServiceSnippetType }) => {
  const response = (await apiService.post(
    SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS,
    payload
  )) as SyntheticsServicePostSnippetResponseType;

  if (response.error) {
    throw new Error(response.message);
  }
  return response as SyntheticsServicePostSnippetSuccessResponseType;
};

export const deleteSnippet = async (payload: { snippet: SyntheticsServiceSnippetWithIdType }) => {
  const response = (await apiService.delete(
    SYNTHETICS_API_URLS.DELETE_SYNTHETICS_PROJECT_SNIPPET.replace('{snippetId}', payload.snippet.id)
  )) as SyntheticsServiceDeleteSnippetResponseType;

  if (response.error) {
    throw new Error(response.message);
  }
  return response as SyntheticsServiceDeleteSnippetSuccessResponseType;
};
