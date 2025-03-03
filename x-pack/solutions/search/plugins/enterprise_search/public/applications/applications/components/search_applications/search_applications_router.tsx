/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import {
  SEARCH_APPLICATIONS_PATH,
  SEARCH_APPLICATION_CREATION_PATH,
  SEARCH_APPLICATION_PATH,
} from '../../routes';

import { NotFound } from '../not_found';
import { SearchApplicationRouter } from '../search_application/search_application_router';

import { SearchApplicationsList } from './search_applications_list';

export const SearchApplicationsRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={SEARCH_APPLICATIONS_PATH}>
        <SearchApplicationsList />
      </Route>
      <Route path={SEARCH_APPLICATION_CREATION_PATH}>
        <SearchApplicationsList createSearchApplicationFlyoutOpen />
      </Route>
      <Route path={SEARCH_APPLICATION_PATH}>
        <SearchApplicationRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};
