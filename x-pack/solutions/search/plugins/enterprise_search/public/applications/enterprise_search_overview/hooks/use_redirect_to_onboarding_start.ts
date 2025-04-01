/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { useObservable } from 'react-use/lib';

import { SEARCH_INDICES_START } from '@kbn/deeplinks-search';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { Status } from '../../../../common/types/api';
import { KibanaDeps } from '../../../../common/types/kibana_deps';

import { FetchIndicesStatusAPILogic } from '../api/fetch_indices_status';

export const useRedirectToOnboardingStart = () => {
  const {
    services: { application, searchIndices, navigation },
  } = useKibana<KibanaDeps>();
  const { makeRequest } = useActions(FetchIndicesStatusAPILogic);
  const { data: indicesStatus, status } = useValues(FetchIndicesStatusAPILogic);
  const isLoading = status === Status.LOADING;
  const isSolutionNav = useObservable(navigation.isSolutionNavEnabled$, false);

  useEffect(() => {
    if (searchIndices?.enabled && isSolutionNav) {
      makeRequest({});
    }
  }, [isSolutionNav, searchIndices]);

  useEffect(() => {
    if (!isLoading && isSolutionNav && indicesStatus?.indexNames.length === 0) {
      application?.navigateToApp(SEARCH_INDICES_START);
    }
  }, [isLoading, application, indicesStatus, isSolutionNav]);

  return { isChecking: isLoading };
};
