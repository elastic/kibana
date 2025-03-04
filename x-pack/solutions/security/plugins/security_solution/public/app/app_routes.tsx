/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { RouteProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import type { Capabilities } from '@kbn/core/public';
import { CASES_FEATURE_ID, CASES_PATH, ONBOARDING_PATH } from '../../common/constants';
import { NotFoundPage } from './404';
import type { StartServices } from '../types';
import { hasAccessToSecuritySolution } from '../helpers_access';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

export interface AppRoutesProps {
  services: StartServices;
  subPluginRoutes: RouteProps[];
}

export const AppRoutes: React.FC<AppRoutesProps> = React.memo(({ services, subPluginRoutes }) => {
  useEffect(() => {
    return () => console.log('AppRoutes unmounted');
  }, []);
  const appRoutes = useMemo(() => {
    console.log('rerunnin');
    return [
      ...subPluginRoutes.map(({ component: Component, ...rest }, index) => {
        console.log(rest);
        if (!Component) {
          console.log('no component', { rest });
          return <Route {...rest} key={rest.path} />;
        }
        console.log('component, key: ', rest.path, { rest });
        return (
          <Route
            {...rest}
            key={rest.path}
            render={(props) => {
              return <Component {...props} services={services} />;
            }}
          />
        );
      }),
      <Route>
        <RedirectRoute capabilities={services.application.capabilities} />
      </Route>,
    ];
  }, [services, subPluginRoutes]);
  return (
    <Routes>
      <PluginTemplateWrapper>{appRoutes}</PluginTemplateWrapper>
    </Routes>
  );
});
AppRoutes.displayName = 'AppRoutes';

export const RedirectRoute = React.memo<{ capabilities: Capabilities }>(({ capabilities }) => {
  if (hasAccessToSecuritySolution(capabilities)) {
    console.log('redirecting to onboarding');
    return <Redirect to={ONBOARDING_PATH} />;
  }
  if (capabilities[CASES_FEATURE_ID].read_cases === true) {
    console.log('redirecting to cases');
    return <Redirect to={CASES_PATH} />;
  }
  console.log('redirecting to not found');
  return <NotFoundPage />;
});
RedirectRoute.displayName = 'RedirectRoute';
