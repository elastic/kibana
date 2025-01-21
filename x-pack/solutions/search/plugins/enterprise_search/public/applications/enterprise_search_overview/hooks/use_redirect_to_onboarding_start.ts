/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useObservable } from 'react-use/lib';

import { SEARCH_INDICES_START } from '@kbn/deeplinks-search';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { KibanaDeps } from '../../../../common/types/kibana_deps';

export const useRedirectToOnboardingStart = () => {
  const {
    services: { application, searchIndices, navigation },
  } = useKibana<KibanaDeps>();

  const { data: indicesStatus, isFetching } = searchIndices?.fetchIndicesStatus() || {};
  const isSolutionNav = useObservable(navigation.isSolutionNavEnabled$, false);

  useEffect(() => {
    if (!isFetching && isSolutionNav && indicesStatus?.indexNames.length === 0) {
      application?.navigateToApp(SEARCH_INDICES_START);
    }
  }, [isFetching, application, indicesStatus, isSolutionNav]);

  return { isChecking: isFetching };
};
