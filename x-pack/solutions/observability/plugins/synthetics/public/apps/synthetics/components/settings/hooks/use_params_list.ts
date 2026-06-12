/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getGlobalParamAction, selectGlobalParamState } from '../../../state/global_params';

export const useParamsList = () => {
  const { isLoading, listOfParams } = useSelector(selectGlobalParamState);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getGlobalParamAction.get());
  }, [dispatch]);

  return useMemo(() => {
    return {
      items: listOfParams ?? [],
      isLoading,
    };
  }, [listOfParams, isLoading]);
};
