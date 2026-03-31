/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { createRoot } from 'react-dom/client';
import { EntityStoreApp } from './components/app';

export const renderApp = (coreStart: CoreStart, { element }: AppMountParameters) => {
  const { http, rendering } = coreStart;

  const root = createRoot(element);
  root.render(rendering.addContext(<EntityStoreApp http={http} />));

  return () => root.unmount();
};
