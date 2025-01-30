/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { InitialAppData } from '../../../common/types';

import { ProductSelector } from './components/product_selector';
import { ROOT_PATH } from './routes';

export const EnterpriseSearchOverview: React.FC<InitialAppData> = ({}) => {
  return (
    <Routes>
      <Route exact path={ROOT_PATH}>
        <ProductSelector />
      </Route>
    </Routes>
  );
};
