/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux-v7';

import { Context, store } from './redux/redux';

/**
 * Wrap the part of the application that consumes the data view manager with this
 * provider. It exposes the package's internal, isolated redux store through a
 * dedicated react-redux context.
 */
export const DataViewManagerProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ReduxProvider context={Context} store={store}>
      {children}
    </ReduxProvider>
  );
};
