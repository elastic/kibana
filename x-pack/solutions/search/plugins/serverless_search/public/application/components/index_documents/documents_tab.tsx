/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexDetailsTab } from '@kbn/index-management-plugin/common/constants';
import React, { Suspense, lazy } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { ServerlessSearchPluginStartDependencies } from '../../../types';

const IndexDocuments = lazy(() => import('./documents'));

export const createIndexDocumentsContent = (
  core: CoreStart,
  services: ServerlessSearchPluginStartDependencies
): IndexDetailsTab => {
  return {
    id: 'documents',
    name: (
      <FormattedMessage
        defaultMessage="Documents"
        id="xpack.serverlessSearch.indexManagementTab.documents"
      />
    ),
    order: 11,
    renderTabContent: ({ index }) => {
      const queryClient = new QueryClient();
      return (
        <KibanaContextProvider services={{ ...core, ...services }}>
          <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />
            <Suspense fallback={<EuiLoadingSpinner />}>
              <IndexDocuments indexName={index.name} />
            </Suspense>
          </QueryClientProvider>
        </KibanaContextProvider>
      );
    },
  };
};
