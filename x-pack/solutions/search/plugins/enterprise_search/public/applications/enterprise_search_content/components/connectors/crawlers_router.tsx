/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { CRAWLERS_PATH, NEW_CRAWLER_PATH } from '../../routes';
import { NewSearchIndexPage } from '../new_index/new_search_index_page';

import { Connectors } from './connectors';

export const CrawlersRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={NEW_CRAWLER_PATH}>
        <NewSearchIndexPage type="crawler" />
      </Route>
      <Route path={CRAWLERS_PATH}>
        <Connectors isCrawler />
      </Route>
    </Routes>
  );
};
