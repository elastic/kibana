/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useReducer } from 'react';

import type { ManageRoutesSpyProps, RouteSpyState, RouteSpyAction } from './types';
import { RouterSpyStateContext, initRouteSpy } from './helpers';

const ManageRoutesSpyComponent: FC<ManageRoutesSpyProps> = ({ children }) => {
  const reducerSpyRoute = (state: RouteSpyState, action: RouteSpyAction): RouteSpyState => {
    switch (action.type) {
      case 'updateRoute':
        return action.route;
      case 'updateRouteWithOutSearch':
        return { ...state, ...action.route } as RouteSpyState;
      case 'updateSearch':
        return { ...state, search: action.search };
      default:
        return state;
    }
  };

  return (
    <RouterSpyStateContext.Provider value={useReducer(reducerSpyRoute, initRouteSpy)}>
      {children}
    </RouterSpyStateContext.Provider>
  );
};

export const ManageRoutesSpy = memo(ManageRoutesSpyComponent);
