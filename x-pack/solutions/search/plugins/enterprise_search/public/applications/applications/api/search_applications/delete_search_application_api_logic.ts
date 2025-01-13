/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface DeleteSearchApplicationApiLogicArguments {
  searchApplicationName: string;
}
export interface DeleteSearchApplicationApiLogicResponse {
  searchApplicationName: string;
}

export const deleteSearchApplication = async ({
  searchApplicationName,
}: DeleteSearchApplicationApiLogicArguments): Promise<DeleteSearchApplicationApiLogicResponse> => {
  const route = `/internal/enterprise_search/search_applications/${searchApplicationName}`;
  await HttpLogic.values.http.delete<DeleteSearchApplicationApiLogicResponse>(route);
  return { searchApplicationName };
};
export const DeleteSearchApplicationAPILogic = createApiLogic(
  ['search_applications', 'delete_search_application_api_logic'],
  deleteSearchApplication,
  {
    showSuccessFlashFn: ({ searchApplicationName }) =>
      i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.deleteSearchApplication.successToast.title',
        {
          defaultMessage: '{searchApplicationName} has been deleted',
          values: {
            searchApplicationName,
          },
        }
      ),
  }
);

export type DeleteSearchApplicationApiLogicActions = Actions<
  DeleteSearchApplicationApiLogicArguments,
  DeleteSearchApplicationApiLogicResponse
>;
