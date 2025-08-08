/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecurityPageName } from '../../../../common';
import { useLinkInfo } from '../../links';
import { NoPrivilegesPage } from '../no_privileges';
import { useUpsellingPage } from '../../hooks/use_upselling';
import { SpyRoute } from '../../utils/route/spy_routes';

interface SecurityRoutePageWrapperOptionProps {
  /**
   * Used to disable the SpyRoute for the page, if e.g. the page's need to render their own specific SpyRoute.
   * @default false
   */
  omitSpyRoute?: boolean;
}

type SecurityRoutePageWrapperProps = {
  pageName: SecurityPageName;
} & SecurityRoutePageWrapperOptionProps;

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
export const SecurityRoutePageWrapper: React.FC<PropsWithChildren<SecurityRoutePageWrapperProps>> =
  React.memo(({ children, pageName, omitSpyRoute = false }) => {
    const link = useLinkInfo(pageName);
    const UpsellingPage = useUpsellingPage(pageName);

    // The upselling page is only returned when the license/product requirements are not met.
    // When it is defined it must be rendered, no need to check anything else.
    if (UpsellingPage) {
      return (
        <>
          <SpyRoute pageName={pageName} />
          <UpsellingPage />
        </>
      );
    }

    // Redirect to the home page if the link does not exist in the application links (has been filtered out).
    // or if the link is unavailable (payment plan not met, if it had upselling page associated it would have been rendered above).
    if (link == null || link.unavailable) {
      return <Redirect to="" />;
    }

    // Show the no privileges page if the link is unauthorized.
    if (link.unauthorized) {
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

    return (
      <TrackApplicationView viewId={pageName}>
        {children}
        {!omitSpyRoute && <SpyRoute pageName={pageName} />}
      </TrackApplicationView>
    );
  });
SecurityRoutePageWrapper.displayName = 'SecurityRoutePageWrapper';

/**
 * HOC to wrap a component with the `SecurityRoutePageWrapper`.
 */
export const withSecurityRoutePageWrapper = <T extends {}>(
  Component: React.ComponentType<T>,
  pageName: SecurityPageName,
  options: SecurityRoutePageWrapperOptionProps = {}
) => {
  return React.memo(function WithSecurityRoutePageWrapper(props: T) {
    return (
      <SecurityRoutePageWrapper pageName={pageName} {...options}>
        <Component {...props} />
      </SecurityRoutePageWrapper>
    );
  });
};
