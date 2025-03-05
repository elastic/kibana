/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { SearchUxSandboxHome } from './pages/search_ux_sandbox_home';
import { ProjectExample } from './pages/project_example';

export const SearchUxSandboxRouter = () => {
  return (
    <Routes>
      <Route exact path="/">
        <SearchUxSandboxHome />
      </Route>
      <Route exact path="/project-example">
        <ProjectExample />
      </Route>
    </Routes>
  );
};
