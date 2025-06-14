/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecurityPageName, SecurityPageNameAiSoc } from '@kbn/deeplinks-security';
import { NoPrivilegesPage, SpyRoute } from '@kbn/security-solution-plugin/public';
import { useLinkInfo } from '../../links/links_hooks';
import { useUpsellingPage } from './use_upselling';

interface AiRoutePageWrapperOptionProps {
  /**
   * Used to disable the SpyRoute for the page, if e.g. the page's need to render their own specific SpyRoute.
   * @default false
   */
  omitSpyRoute?: boolean;
}

type AiRoutePageWrapperProps = {
  pageName: SecurityPageNameAiSoc;
} & AiRoutePageWrapperOptionProps;

/**
 * This component is created to wrap all the pages in the AI for SOC app.
 *
 * It handles application tracking and upselling.
 *
 * When using this component make sure it render bellow `PluginTemplateWrapper` and
 * that you removed the `TrackApplicationView` component.
 *
 * Ex:
 * ```
 * <PluginTemplateWrapper>
 *   <AiRoutePageWrapper pageName={SecurityPageNameAiSoc.myPage}>
 *     <MyPage />
 *   </AiRoutePageWrapper>
 * </PluginTemplateWrapper>
 * ```
 */
export const AiRoutePageWrapper: React.FC<PropsWithChildren<AiRoutePageWrapperProps>> = React.memo(
  ({ children, pageName, omitSpyRoute = false }) => {
    console.log('pageName', pageName);
    const link = useLinkInfo(pageName);
    const UpsellingPage = useUpsellingPage(pageName);

    // The upselling page is only returned when the license/product requirements are not met.
    // When it is defined it must be rendered, no need to check anything else.
    if (UpsellingPage) {
      return (
        <>
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
        {!omitSpyRoute && <SpyRoute pageName={pageName as unknown as SecurityPageName} />}
      </TrackApplicationView>
    );
  }
);

AiRoutePageWrapper.displayName = 'AiRoutePageWrapper';

/**
 * HOC to wrap a component with the `AiRoutePageWrapper`.
 */
export const withAiRoutePageWrapper = <T extends {}>(
  Component: React.ComponentType<T>,
  pageName: SecurityPageNameAiSoc,
  options: AiRoutePageWrapperOptionProps = {}
) => {
  console.log('withAiRoutePageWrapper', pageName);
  return React.memo(function WithAiRoutePageWrapper(props: T) {
    console.log('tttttt', pageName);
    return (
      <AiRoutePageWrapper pageName={pageName} {...options}>
        <Component {...props} />
      </AiRoutePageWrapper>
    );
  });
};
