/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';

import { useKibana } from '../hooks/use_kibana';
import {
  SearchIndexDetailsTabs,
  SEARCH_INDICES_DETAILS_PATH,
  SEARCH_INDICES_DETAILS_TABS_PATH,
  CREATE_INDEX_PATH,
} from '../routes';
import { SearchIndexDetailsPage } from './indices/details_page';
import { CreateIndexPage } from './create_index/create_index_page';

export const IndexManagementIndicesRouter: React.FC = () => {
  const { application, history } = useKibana().services;
  return (
    <Router history={history}>
      <Routes>
        <Route exact path={'/app/elasticsearch/index_management'}></Route>
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
