/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux-v7';
import { useKibana } from '../../../../../common/lib/kibana';
import { inputsActions } from '../../../../../common/store/inputs';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useEntityAnalyticsUrlState } from './use_entity_analytics_url_state';

export const useResetEntityGridFilters = (): (() => void) => {
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;
  const dispatch = useDispatch();
  const { resetGridQuery } = useEntityAnalyticsUrlState();

  return useCallback(() => {
    filterManager.setAppFilters([]);
    dispatch(
      inputsActions.setFilterQuery({
        id: InputsModelId.global,
        query: '',
        language: 'kuery',
      })
    );
    dispatch(
      inputsActions.setSavedQuery({
        id: InputsModelId.global,
        savedQuery: undefined,
      })
    );
    resetGridQuery();
  }, [dispatch, filterManager, resetGridQuery]);
};
