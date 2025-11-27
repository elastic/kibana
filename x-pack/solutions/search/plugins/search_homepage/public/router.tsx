/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';

import { SearchHomepagePage } from './components/search_homepage';
import { SearchHomepagePage as SearchHomepagePageV2 } from './components/search_homepage/search_homepage';
import { useKibana } from './hooks/use_kibana';
import { SEARCH_HOMEPAGE_V2_UI_FLAG } from '../common';

export const HomepageRouter = () => {
  const {
    services: { settings },
  } = useKibana();

  const isNewDesignEnabled = settings?.client.get<boolean>(SEARCH_HOMEPAGE_V2_UI_FLAG, false);

  return (
    <Routes>
      {isNewDesignEnabled && (
        <Route exact path="/v2">
          <SearchHomepagePageV2 />
        </Route>
      )}
      <Route>
        <SearchHomepagePage />
      </Route>
    </Routes>
  );
};
