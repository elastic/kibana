/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { BasicRules } from '../tabs/basic_rules';
import { KnowledgeSources } from '../tabs/knowledge_sources';
import { Integrations } from '../tabs/integrations';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import { ConfigurationTabs } from './configuration_tabs';

export const ConfigurationsRouter = React.memo(() => {
  return (
    <Routes>
      <Route
        path={`${CONFIGURATIONS_PATH}/:tab(${ConfigurationTabs.integrations})`}
        component={Integrations}
      />
      <Route
        path={`${CONFIGURATIONS_PATH}/:tab(${ConfigurationTabs.knowledgeSources})`}
        component={KnowledgeSources}
      />
      <Route
        path={`${CONFIGURATIONS_PATH}/:tab(${ConfigurationTabs.basicRules})`}
        component={BasicRules}
      />
      <Route
        path={`${CONFIGURATIONS_PATH}`}
        exact
        render={() => <Redirect to={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`} />}
      />
    </Routes>
  );
});

ConfigurationsRouter.displayName = 'ConfigurationsRouter';
