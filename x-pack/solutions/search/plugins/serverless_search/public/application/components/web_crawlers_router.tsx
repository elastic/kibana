/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { WebCrawlersOverview } from './web_crawlers_overview';
import { WebCrawlersElasticManaged } from './web_crawlers_elastic_managed';

export const WebCrawlersRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path="/">
        <WebCrawlersOverview />
      </Route>
      <Route exact path="/elastic_managed">
        <WebCrawlersElasticManaged />
      </Route>
    </Routes>
  );
};
