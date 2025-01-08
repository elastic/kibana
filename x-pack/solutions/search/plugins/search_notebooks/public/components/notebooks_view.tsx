/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SearchNotebooks } from './search_notebooks';
import { AppMetricsTracker, NotebookListValue } from '../types';

export interface SearchNotebooksViewProps {
  core: CoreStart;
  queryClient: QueryClient;
  usageTracker: AppMetricsTracker;
  getNotebookList: () => NotebookListValue;
}

export const SearchNotebooksView = ({
  core,
  queryClient,
  usageTracker,
  getNotebookList,
}: SearchNotebooksViewProps) => {
  React.useEffect(() => {
    usageTracker.count('opened_notebooks_view');
  }, [usageTracker]);

  return (
    <KibanaThemeProvider theme={core.theme}>
      <KibanaContextProvider services={{ ...core, notebooks: { getNotebookList }, usageTracker }}>
        <QueryClientProvider client={queryClient}>
          <SearchNotebooks />
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
