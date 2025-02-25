/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { RootState } from '../reducer';
import { shared } from '../slices';

export const createInitListener = (dependencies: { dataViews: DataViewsServicePublic }) => {
  return {
    actionCreator: shared.actions.init,
    effect: async (
      _action: AnyAction,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        const dataViews = await dependencies.dataViews.getAllDataViewLazy();
        const dataViewSpecs = await Promise.all(dataViews.map((dataView) => dataView.toSpec()));

        listenerApi.dispatch(shared.actions.setDataViews(dataViewSpecs));
      } catch (error: unknown) {
        listenerApi.dispatch(shared.actions.error());
      }
    },
  };
};
