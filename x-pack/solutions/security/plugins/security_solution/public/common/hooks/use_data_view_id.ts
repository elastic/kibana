/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import type { PageScope } from '../../data_view_manager/constants';
import { sourcererScopeSelectedDataViewId } from '../../sourcerer/store/selectors';
import type { State } from '../store';

export const useDataViewId = (scopeId: PageScope): string | undefined => {
  const dataViewId = useSelector((state: State) =>
    sourcererScopeSelectedDataViewId(state, scopeId)
  );
  return dataViewId ?? undefined;
};
