/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { Routes, Route } from '@kbn/shared-ux-router';

import { NotFound } from './components/not_found';
import { Playground } from './components/playground/playground';
import { SearchApplicationsRouter } from './components/search_applications/search_applications_router';
import {
  PLAYGROUND_CHAT_PATH,
  PLAYGROUND_PATH,
  PLAYGROUND_SEARCH_PATH,
  ROOT_PATH,
  SEARCH_APPLICATIONS_PATH,
} from './routes';

export const Applications = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={PLAYGROUND_PATH} />
      <Route path={SEARCH_APPLICATIONS_PATH}>
        <SearchApplicationsRouter />
      </Route>
      <Redirect exact from={PLAYGROUND_PATH} to={PLAYGROUND_CHAT_PATH} />
      <Route path={PLAYGROUND_CHAT_PATH}>
        <Playground pageMode={'chat'} />
      </Route>
      <Route path={PLAYGROUND_SEARCH_PATH}>
        <Playground pageMode={'search'} />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};
