/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { SynonymsSetDetail } from './components/synonyms_set_detail/synonyms_set_detail';
import { SearchSynonymsOverview } from './components/overview/overview';

export const SearchSynonymsRouter = () => {
  return (
    <Routes>
      <Route exact path="/sets/:synonymsSetId">
        <SynonymsSetDetail />
      </Route>
      <Route exact path="/">
        <SearchSynonymsOverview />
      </Route>
    </Routes>
  );
};
