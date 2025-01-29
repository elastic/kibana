/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { NEW_INDEX_PATH, NEW_API_PATH } from '../../routes';

import { NewIndex } from './new_index';
import { NewSearchIndexPage } from './new_search_index_page';

export const NewIndexRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={NEW_INDEX_PATH} exact>
        <NewIndex />
      </Route>
      <Route path={NEW_API_PATH} exact>
        <NewSearchIndexPage type="api" />
      </Route>
    </Routes>
  );
};
