/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchConnectors } from '../api';
import * as i18n from './translations';

export const useFetchConnectorsQuery = () => {
  const { addError } = useAppToasts();

  return useQuery(
    ['GET', BASE_ACTION_API_PATH, 'connectors'],
    ({ signal }) => fetchConnectors(signal),
    {
      onError: (error) => {
        addError(error, {
          title: i18n.CONNECTORS_FETCH_ERROR,
          toastMessage: i18n.ACTIONS_FETCH_ERROR_DESCRIPTION,
        });
      },
    }
  );
};
