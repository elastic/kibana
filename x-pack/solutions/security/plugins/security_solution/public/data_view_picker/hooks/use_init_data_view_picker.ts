/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { addListener, removeListener } from '@reduxjs/toolkit';
import { shared, selectDataViewAsync } from '../redux/reducer';
import { useKibana } from '../../common/lib/kibana';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewPickerScopeName } from '../constants';
import { createDataViewSelectedListener } from '../redux/listeners/data_view_selected';
import { createInitListener } from '../redux/listeners/init_listener';

/**
 * Should only be used once in the application, on the top level of the rendering tree
 */
export const useInitDataViewPicker = () => {
  const dispatch = useDispatch();
  const services = useKibana().services;

  useEffect(() => {
    const dataViewsLoadingListener = createInitListener({
      dataViews: services.dataViews,
    });

    const dataViewSelectedListener = createDataViewSelectedListener({
      dataViews: services.dataViews,
    });

    dispatch(addListener(dataViewsLoadingListener));
    dispatch(addListener(dataViewSelectedListener));

    dispatch(shared.actions.init());

    // Preload the default view
    dispatch(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: DataViewPickerScopeName.default,
      })
    );

    return () => {
      dispatch(removeListener(dataViewsLoadingListener));
      dispatch(removeListener(dataViewSelectedListener));
    };
  }, [dispatch, services.dataViews]);
};
