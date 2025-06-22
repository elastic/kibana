/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { CREATE_QUERY_RULESET_PATH, QUERY_RULESET_DETAIL_PATH, ROOT_PATH } from './routes';
import { QueryRulesOverview } from './components/overview/overview';
import { QueryRulesetDetail } from './components/query_ruleset_detail/query_ruleset_detail';

export const QueryRulesRouter = () => {
  return (
    <Routes>
      <Route exact path={QUERY_RULESET_DETAIL_PATH}>
        <QueryRulesetDetail />
      </Route>
      <Route exact path={CREATE_QUERY_RULESET_PATH}>
        <QueryRulesetDetail createMode />
      </Route>
      <Route exact path={ROOT_PATH}>
        <QueryRulesOverview />
      </Route>
    </Routes>
  );
};
