/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { CRAWLERS_PATH, CRAWLERS_ELASTIC_MANAGED_PATH } from '../../routes';

import { Connectors } from './connectors';

export const CrawlersRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={CRAWLERS_PATH}>
        <Connectors isCrawler isCrawlerSelfManaged />
      </Route>
      <Route exact path={CRAWLERS_ELASTIC_MANAGED_PATH}>
        <Connectors isCrawler isCrawlerSelfManaged={false} />
      </Route>
    </Routes>
  );
};
