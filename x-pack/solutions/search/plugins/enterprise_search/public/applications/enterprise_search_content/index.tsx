/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { Route, Routes } from '@kbn/shared-ux-router';

import { InitialAppData } from '../../../common/types';

import { ConnectorsRouter } from './components/connectors/connectors_router';
import { CrawlersRouter } from './components/connectors/crawlers_router';
import { NotFound } from './components/not_found';
import { SearchIndicesRouter } from './components/search_indices';
import { CONNECTORS_PATH, CRAWLERS_PATH, ROOT_PATH, SEARCH_INDICES_PATH } from './routes';

export const EnterpriseSearchContent: React.FC<InitialAppData> = (props) => {
  return (
    <Routes>
      <Route>
        <EnterpriseSearchContentConfigured {...(props as Required<InitialAppData>)} />
      </Route>
    </Routes>
  );
};

export const EnterpriseSearchContentConfigured: React.FC<Required<InitialAppData>> = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={SEARCH_INDICES_PATH} />
      <Route path={SEARCH_INDICES_PATH}>
        <SearchIndicesRouter />
      </Route>
      <Route path={CONNECTORS_PATH}>
        <ConnectorsRouter />
      </Route>
      <Route path={CRAWLERS_PATH}>
        <CrawlersRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};
