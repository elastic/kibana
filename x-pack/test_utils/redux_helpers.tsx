/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { Provider } from 'react-redux';

export const WithStore = (store: any) => (WrappedComponent: ComponentType) => (props: any) => (
  <Provider store={store}>
    <WrappedComponent {...props} />
  </Provider>
);
