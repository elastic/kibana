/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { EntityStoreApp } from './components/app';

export const renderApp = (coreStart: CoreStart, { element }: AppMountParameters) => {
  const { http, rendering } = coreStart;

  ReactDOM.render(rendering.addContext(<EntityStoreApp http={http} />), element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
