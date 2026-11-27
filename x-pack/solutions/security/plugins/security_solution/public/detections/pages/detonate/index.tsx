/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { SecurityRoutePageWrapper } from '../../../common/components/security_route_page_wrapper';
import { DetonatePage } from './detonate_page';
import { NotFoundPage } from '../../../app/404';
import { DETONATE_PATH, SecurityPageName } from '../../../../common/constants';
import { PluginTemplateWrapper } from '../../../common/components/plugin_template_wrapper';

const DetonateRoute = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.detonate}>
      <DetonatePage />
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
);

export const DetonateContainer: React.FC = React.memo(() => (
  <Routes>
    <Route path={DETONATE_PATH} exact component={DetonateRoute} />
    <Route component={NotFoundPage} />
  </Routes>
));
DetonateContainer.displayName = 'DetonateContainer';
