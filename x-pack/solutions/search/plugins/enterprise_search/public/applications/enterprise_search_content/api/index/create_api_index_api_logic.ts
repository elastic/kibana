/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

interface CreateApiIndexValue {
  index: string;
}

export interface CreateApiIndexApiLogicArgs {
  deleteExistingConnector?: boolean;
  indexName: string;
  language: string | null;
}

export interface CreateApiIndexApiLogicResponse {
  indexName: string;
}

export const createApiIndex = async ({
  indexName,
  language,
}: CreateApiIndexApiLogicArgs): Promise<CreateApiIndexApiLogicResponse> => {
  const route = '/internal/enterprise_search/indices';
  const params = {
    index_name: indexName,
    language,
  };
  const result = await HttpLogic.values.http.post<CreateApiIndexValue>(route, {
    body: JSON.stringify(params),
  });
  return {
    indexName: result.index,
  };
};

export const CreateApiIndexApiLogic = createApiLogic(
  ['create_api_index_api_logic'],
  createApiIndex
);

export type CreateApiIndexApiLogicActions = Actions<
  CreateApiIndexApiLogicArgs,
  CreateApiIndexApiLogicResponse
>;
