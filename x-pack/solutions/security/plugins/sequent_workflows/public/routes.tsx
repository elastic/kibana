/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { WorkflowPage } from './components/workflow_page';

interface AppRoutesProps {
  history: ScopedHistory;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ history }) => (
  <Router history={history}>
    <Routes>
      <Route path="/" exact component={WorkflowPage} />
    </Routes>
  </Router>
);
