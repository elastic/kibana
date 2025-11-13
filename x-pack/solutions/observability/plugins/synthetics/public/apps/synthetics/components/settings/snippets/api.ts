/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SyntheticsServiceGetSnippetsResponse,
  SyntheticsServiceGetSnippetsSuccessResponse,
  SyntheticsServicePostSnippetResponse,
  SyntheticsServicePostSnippetSuccessResponse,
  SyntheticsServiceSnippet,
} from '../../../../../../common/runtime_types/synthetics_service_snippet';
import { apiService } from '../../../../../utils/api_service';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';

export const getSnippets = async () => {
  const response = (await apiService.get(
    SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS
  )) as SyntheticsServiceGetSnippetsResponse;

  if (response.error) {
    throw new Error(response.message);
  }
  return response as SyntheticsServiceGetSnippetsSuccessResponse;
};

export const postSnippet = async (payload: { snippet: SyntheticsServiceSnippet }) => {
  const response = (await apiService.post(
    SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS,
    payload
  )) as SyntheticsServicePostSnippetResponse;

  if (response.error) {
    throw new Error(response.message);
  }
  return response as SyntheticsServicePostSnippetSuccessResponse;
};
