/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { InitialAppData } from '../../../common/types';

import { AISearchGuide } from './components/ai_search_guide/ai_search_guide';

import { ROOT_PATH } from './routes';

export const EnterpriseSearchAISearch: React.FC<InitialAppData> = () => {
  return (
    <Routes>
      <Route exact path={ROOT_PATH}>
        <AISearchGuide />
      </Route>
    </Routes>
  );
};
