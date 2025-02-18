/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route } from '@kbn/shared-ux-router';
import { type RouteProps } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { cloudDefendPages } from '../common/navigation/constants';
import { useSecuritySolutionContext } from './security_solution_context';
import type { CloudDefendPageNavigationItem } from '../common/navigation/types';

type CloudDefendRouteProps = Omit<RouteProps, 'render'> & CloudDefendPageNavigationItem;

// Security SpyRoute can be automatically rendered for pages with static paths, Security will manage everything using the `links` object.
// Pages with dynamic paths are not in the Security `links` object, they must render SpyRoute with the parameters values, if needed.
const STATIC_PATH_PAGE_IDS = Object.fromEntries(
  Object.values(cloudDefendPages).map(({ id }) => [id, true])
);

export const CloudDefendRoute: React.FC<CloudDefendRouteProps> = ({
  id,
  children,
  component: Component,
  disabled = false,
  ...cloudDefendRouteProps
}) => {
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();

  if (disabled) {
    return null;
  }

  const routeProps: RouteProps = {
    ...cloudDefendRouteProps,
    ...(Component && {
      render: (renderProps) => (
        <TrackApplicationView viewId={id}>
          {STATIC_PATH_PAGE_IDS[id] && SpyRoute && <SpyRoute pageName={id} />}
          <Component {...renderProps} />
        </TrackApplicationView>
      ),
    }),
  };

  return <Route {...routeProps}>{children}</Route>;
};
