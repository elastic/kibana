/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';

import { useKibana } from '../hooks/use_kibana';
import {
  SEARCH_INDICES_DETAILS_PATH,
  SEARCH_INDICES_DETAILS_TABS_PATH,
  CREATE_INDEX_PATH,
} from '../routes';
import { SearchIndexDetailsPage } from './indices/details_page';
import { CreateIndexPage } from './create_index/create_index_page';
import { RedirectWithQuery } from './redirect_with_query';

export const SearchIndicesRouter: React.FC = () => {
  const { application, history } = useKibana().services;
  return (
    <Router history={history}>
      <Routes>
        <Route exact path={[SEARCH_INDICES_DETAILS_TABS_PATH, SEARCH_INDICES_DETAILS_PATH]}>
          <Routes>
            <Route path={SEARCH_INDICES_DETAILS_TABS_PATH} component={SearchIndexDetailsPage} />
            <RedirectWithQuery />
          </Routes>
        </Route>
        <Route exact path={CREATE_INDEX_PATH} component={CreateIndexPage} />
        <Route
          render={() => {
            application.navigateToApp('elasticsearchStart');
            return null;
          }}
        />
      </Routes>
    </Router>
  );
};
