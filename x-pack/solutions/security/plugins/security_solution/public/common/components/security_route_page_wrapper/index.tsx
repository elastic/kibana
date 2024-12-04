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
  redirectOnMissing,
}) => {
  const link = useLinkInfo(pageName);
  const UpsellingPage = useUpsellingPage(pageName);

  // The upselling page is only returned when the license/product requirements are not met,
  // When it is defined it must be rendered, no need to check anything else.
  if (UpsellingPage) {
    return (
      <>
        <SpyRoute pageName={pageName} />
        <UpsellingPage />
      </>
    );
  }

  const isAuthorized = link != null && !link.unauthorized;
  if (isAuthorized) {
    return (
      <TrackApplicationView viewId={pageName}>
        {children}
        <SpyRoute pageName={pageName} />
      </TrackApplicationView>
    );
  }

  if (redirectOnMissing && link == null) {
    return <Redirect to="" />; // redirects to the home page
  }

  return (
    <>
      <SpyRoute pageName={pageName} />
      <NoPrivilegesPage
        pageName={pageName}
        docLinkSelector={(docLinks) => docLinks.siem.privileges}
      />
    </>
  );
};

/**
 * HOC to wrap a component with the `SecurityRoutePageWrapper`.
 */
export const withSecurityRoutePageWrapper = <T extends {}>(
  Component: React.ComponentType<T>,
  pageName: SecurityPageName,
  redirectOnMissing?: boolean
) => {
  return function WithSecurityRoutePageWrapper(props: T) {
    return (
      <SecurityRoutePageWrapper pageName={pageName} redirectOnMissing={redirectOnMissing}>
        <Component {...props} />
      </SecurityRoutePageWrapper>
    );
  };
};
