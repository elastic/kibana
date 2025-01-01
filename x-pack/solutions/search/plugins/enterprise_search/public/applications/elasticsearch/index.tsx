/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { InitialAppData } from '../../../common/types';

import { ElasticsearchGuide } from './components/elasticsearch_guide/elasticsearch_guide';

import { ROOT_PATH } from './routes';

export const Elasticsearch: React.FC<InitialAppData> = () => {
  return (
    <Routes>
      <Route exact path={ROOT_PATH}>
        <ElasticsearchGuide />
      </Route>
    </Routes>
  );
};
