/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecurityPageName } from '../../../../common';
import { useLinkInfo } from '../../links';
import { NoPrivilegesPage } from '../no_privileges';
import { useUpsellingPage } from '../../hooks/use_upselling';
import { SpyRoute } from '../../utils/route/spy_routes';

interface SecurityRoutePageWrapperProps {
  pageName: SecurityPageName;
  redirectOnMissing?: boolean;
  /**
   * Used primarily in the AI for SOC tier, to allow redirecting to the home page instead of showing the NoPrivileges page.
   */
  redirectIfUnauthorized?: boolean;
  // Used to disable the SpyRoute for the page, if e.g. the page's children have their own SpyRoute specified.
  omitSpyRoute?: boolean;
}

/**
 * This component is created to wrap all the pages in the security solution app.
 *
 * It handles application tracking and upselling.
 *
 * When using this component make sure it render bellow `SecurityPageWrapper` and
 * that you removed the `TrackApplicationView` component.
 *
 * Ex:
 * ```
 * <PluginTemplateWrapper>
 *   <SecurityRoutePageWrapper pageName={SecurityPageName.myPage}>
 *     <MyPage />
 *   </SecurityRoutePageWrapper>
 * </PluginTemplateWrapper>
 * ```
 */
export const SecurityRoutePageWrapper: FC<PropsWithChildren<SecurityRoutePageWrapperProps>> = ({
  children,
  pageName,
  redirectIfUnauthorized,
  redirectOnMissing,
  omitSpyRoute,
}) => {
  const link = useLinkInfo(pageName);

  // The upselling page is only returned when the license/product requirements are not met.
  // When it is defined it must be rendered, no need to check anything else.
  const UpsellingPage = useUpsellingPage(pageName);
  if (UpsellingPage) {
    return (
      <>
        <SpyRoute pageName={pageName} />
        <UpsellingPage />
      </>
    );
  }

  // Allows a redirect to the home page.
  if (redirectOnMissing && link == null) {
    return <Redirect to="" />;
  }

  const isAuthorized = link != null && !link.unauthorized;

  // Allows a redirect to the home page if the link is undefined or unauthorized.
  // This is used in the AI for SOC tier (for the Alert Summary page for example), as it does not make sense to show the NoPrivilegesPage.
  if (redirectIfUnauthorized && !isAuthorized) {
    return <Redirect to="" />;
  }

  // Show the no privileges page if the link is undefined or unauthorized.
  if (!isAuthorized) {
    return (
      <>
        <SpyRoute pageName={pageName} />
        <NoPrivilegesPage
          pageName={pageName}
          docLinkSelector={(docLinks) => docLinks.siem.privileges}
        />
      </>
    );
  }

  // Show the actual application page.
  return (
    <TrackApplicationView viewId={pageName}>
      {children}
      {!omitSpyRoute && <SpyRoute pageName={pageName} />}
    </TrackApplicationView>
  );
};

/**
 * HOC to wrap a component with the `SecurityRoutePageWrapper`.
 */
export const withSecurityRoutePageWrapper = <T extends {}>(
  Component: React.ComponentType<T>,
  pageName: SecurityPageName,
  {
    redirectOnMissing,
    redirectIfUnauthorized,
    omitSpyRoute,
  }: {
    redirectOnMissing?: boolean;
    redirectIfUnauthorized?: boolean;
    omitSpyRoute?: boolean;
  } = {}
) => {
  return function WithSecurityRoutePageWrapper(props: T) {
    return (
      <SecurityRoutePageWrapper
        pageName={pageName}
        redirectOnMissing={redirectOnMissing}
        redirectIfUnauthorized={redirectIfUnauthorized}
        omitSpyRoute={omitSpyRoute}
      >
        <Component {...props} />
      </SecurityRoutePageWrapper>
    );
  };
};
