/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { Assistant } from '@kbn/elastic-assistant';

import type { SecurityAppStore } from './common/store';
import { AssistantProvider } from './assistant/provider';
import { ReactQueryClientProvider } from './common/containers/query_client/query_client_provider';

export const AIAssistantWorkspaceTool = ({ store }: { store: SecurityAppStore }) => {
  return (
    <ReduxStoreProvider store={store}>
      <ReactQueryClientProvider>
        <AssistantProvider>
          <Assistant />
        </AssistantProvider>
      </ReactQueryClientProvider>
    </ReduxStoreProvider>
  );
};
