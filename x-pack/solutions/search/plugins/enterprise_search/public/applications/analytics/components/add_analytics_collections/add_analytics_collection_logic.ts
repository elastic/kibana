/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { HttpError, Status } from '../../../../../common/types/api';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import {
  flashAPIErrors,
  FlashMessagesLogic,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';
import {
  AddAnalyticsCollectionsAPILogic,
  AddAnalyticsCollectionApiLogicArgs,
  AddAnalyticsCollectionApiLogicResponse,
} from '../../api/add_analytics_collection/add_analytics_collection_api_logic';
import { COLLECTION_OVERVIEW_PATH } from '../../routes';

const SERVER_ERROR_CODE = 500;
const NAME_VALIDATION = new RegExp(/^[a-z0-9\-]+$/);

export interface AddAnalyticsCollectionsActions {
  apiError: Actions<
    AddAnalyticsCollectionApiLogicArgs,
    AddAnalyticsCollectionApiLogicResponse
  >['apiError'];
  apiSuccess: Actions<
    AddAnalyticsCollectionApiLogicArgs,
    AddAnalyticsCollectionApiLogicResponse
  >['apiSuccess'];
  createAnalyticsCollection(): void;
  makeRequest: Actions<
    AddAnalyticsCollectionApiLogicArgs,
    AddAnalyticsCollectionApiLogicResponse
  >['makeRequest'];
  setInputError: (inputError: string | null) => { inputError: string | null };
  setNameValue(name: string): { name: string };
}

interface AddAnalyticsCollectionValues {
  canSubmit: boolean;
  error: HttpError | undefined;
  inputError: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isSystemError: boolean;
  name: string;
  status: Status;
}

export const AddAnalyticsCollectionLogic = kea<
  MakeLogicType<AddAnalyticsCollectionValues, AddAnalyticsCollectionsActions>
>({
  actions: {
    createAnalyticsCollection: () => {},
    setInputError: (inputError) => ({ inputError }),
    setNameValue: (name: string) => ({ name }),
  },
  connect: {
    actions: [AddAnalyticsCollectionsAPILogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [AddAnalyticsCollectionsAPILogic, ['status', 'error']],
  },
  listeners: ({ values, actions }) => ({
    apiError: async (error) => {
      if (values.isSystemError) {
        if (error?.body?.message) {
          FlashMessagesLogic.actions.setFlashMessages([
            {
              description: error.body.message,
              message: i18n.translate(
                'xpack.enterpriseSearch.analytics.collectionsCreate.action.systemErrorMessage',
                {
                  defaultMessage: 'Sorry, there was an error creating your collection.',
                }
              ),
              type: 'error',
            },
          ]);
        } else {
          flashAPIErrors(error);
        }
      } else {
        actions.setInputError(error?.body?.message || null);
      }
    },
    apiSuccess: async ({ name }) => {
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.action.successMessage', {
          defaultMessage: "Successfully added collection ''{name}''",
          values: {
            name,
          },
        })
      );
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(COLLECTION_OVERVIEW_PATH, {
          name,
        })
      );
    },
    createAnalyticsCollection: () => {
      const { name } = values;
      actions.makeRequest({ name });
    },
    setNameValue: ({ name }) => {
      if (!NAME_VALIDATION.test(name)) {
        actions.setInputError(
          i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.invalidName', {
            defaultMessage:
              'Collection name can only contain lowercase letters, numbers, and hyphens',
          })
        );
      }
    },
  }),
  path: ['enterprise_search', 'analytics', 'add_analytics_collection'],
  reducers: {
    inputError: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setInputError: (_, { inputError }) => inputError,
        setNameValue: () => null,
      },
    ],
    name: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setNameValue: (_, { name }) => name,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    canSubmit: [
      () => [selectors.isLoading, selectors.name, selectors.inputError],
      (isLoading, name, inputError) => !isLoading && name.length > 0 && !inputError,
    ],
    isLoading: [() => [selectors.status], (status: Status) => status === Status.LOADING],
    isSuccess: [() => [selectors.status], (status: Status) => status === Status.SUCCESS],
    isSystemError: [
      () => [selectors.status, selectors.error],
      (status: Status, error?: HttpError) =>
        Boolean(status === Status.ERROR && (error?.body?.statusCode || 0) >= SERVER_ERROR_CODE),
    ],
  }),
});
