/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { PlaygroundsListPage } from './playground_list_page';
import { PlaygroundOverview } from './playground_overview';
import { SavedPlaygroundPage } from './saved_playground';

import {
  ROOT_PATH,
  SAVED_PLAYGROUND_PATH,
  SEARCH_PLAYGROUND_CHAT_PATH,
  SEARCH_PLAYGROUND_NOT_FOUND,
  SEARCH_PLAYGROUND_SEARCH_PATH,
} from './routes';
import { useSearchPlaygroundFeatureFlag } from './hooks/use_search_playground_feature_flag';
import { PlaygroundRouteNotFound } from './components/not_found';

export const PlaygroundRouter: React.FC = () => {
  const isSearchModeEnabled = useSearchPlaygroundFeatureFlag();

  return (
    <Routes>
      {isSearchModeEnabled ? (
        <Route exact path={ROOT_PATH} component={PlaygroundsListPage} />
      ) : (
        <Redirect exact from={ROOT_PATH} to={SEARCH_PLAYGROUND_CHAT_PATH} />
      )}
      {!isSearchModeEnabled && (
        <Redirect from={SEARCH_PLAYGROUND_SEARCH_PATH} to={SEARCH_PLAYGROUND_CHAT_PATH} />
      )}
      {isSearchModeEnabled && (
        <Route path={SAVED_PLAYGROUND_PATH} component={SavedPlaygroundPage} />
      )}
      <Route exact path={SEARCH_PLAYGROUND_NOT_FOUND} component={PlaygroundRouteNotFound} />
      <Route path={`/:pageMode/:viewMode?`} component={PlaygroundOverview} />
    </Routes>
  );
};
