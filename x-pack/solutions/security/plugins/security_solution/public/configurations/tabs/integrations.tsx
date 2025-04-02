/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { IntegrationsAllView } from './components/integrations/available';
import { IntegrationsInstalledView } from './components/integrations/installed';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import { ConfigurationTabs, IntegrationsFacets } from '../constants';

export const ConfigurationsIntegrationsHome: React.FC = () => {
  return (
    <Routes>
      <Route
        path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/:view(${IntegrationsFacets.available})`}
        component={IntegrationsAllView}
      />
      <Route
        path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/:view(${IntegrationsFacets.installed})`}
        component={IntegrationsInstalledView}
      />
      <Route
        path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`}
        render={() => (
          <Redirect
            to={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/${IntegrationsFacets.available}`}
          />
        )}
      />
    </Routes>
  );
};
