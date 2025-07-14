/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, type { HTMLAttributeAnchorTarget , type MouseEventHandler, type MouseEvent, useCallback } from 'react';
import { EuiButton, EuiLink, type EuiLinkProps } from '@elastic/eui';
import type { SecurityPageName } from '@kbn/deeplinks-security';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { useGetAppUrl, useNavigateTo } from './navigation';
import { SECURITY_UI_APP_ID } from './constants';

export interface BaseLinkProps {
  /** The Kibana application of the link. Defaults to Security Solution */
  app?: string;
  /** The id of the link. The deepLink id without the application id prefix */
  id?: string;
  /** Extra path of the link. */
  path?: string;
  urlState?: string;
  target?: HTMLAttributeAnchorTarget | undefined;
}

export type GetLinkUrlProps = BaseLinkProps & { absolute?: boolean };
export type GetLinkUrl = (params: GetLinkUrlProps) => string;

export type WrappedLinkProps = BaseLinkProps & {
  /**
   * Optional `onClick` callback prop.
   * It is composed within the returned `onClick` function to perform extra actions when the link is clicked.
   * It does not override the navigation action.
   **/
  onClick?: MouseEventHandler;
};

export interface GetLinkPropsParams extends WrappedLinkProps {
  /**
   * It skips the Kibana history navigation deferring the navigation action to the browser via the `href` attribute.
   * This is useful when the link is used in a component that already handles the navigation or when the link contains `target="_blank"`.
   *
   * Default: `false`
   **/
  skipKibanaNavigation?: boolean;
}
export type GetLinkProps = (params: GetLinkPropsParams) => LinkProps;

export interface LinkProps {
  onClick: MouseEventHandler;
  href: string;
}

/**
 * It returns the `url` to use in link `href`.
 */
export const useGetLinkUrl = () => {
  const { getAppUrl } = useGetAppUrl();

  const getLinkUrl = useCallback<GetLinkUrl>(
    ({ app, id, path = '', absolute = false, urlState }) => {
      const formattedPath = urlState ? formatPath(path, urlState) : path;
      return getAppUrl({ appId: app, deepLinkId: id, path: formattedPath, absolute });
    },
    [getAppUrl]
  );

  return getLinkUrl;
};

/**
 * It returns the `onClick` and `href` props to use in link components based on the` deepLinkId` and `path` parameters.
 */
export const useGetLinkProps = (): GetLinkProps => {
  const getLinkUrl = useGetLinkUrl();
  const { navigateTo } = useNavigateTo();

  const getLinkProps = useCallback<GetLinkProps>(
    ({ app, id, path, urlState, onClick: onClickProps, skipKibanaNavigation = false }) => {
      const url = getLinkUrl({ app, id, path, urlState });
      return {
        href: url,
        onClick: (ev: MouseEvent) => {
          if (isModifiedEvent(ev)) {
            return;
          }
          if (onClickProps) {
            onClickProps(ev);
          }
          if (!skipKibanaNavigation) {
            ev.preventDefault();
            navigateTo({ url });
          }
        },
      };
    },
    [getLinkUrl, navigateTo]
  );

  return getLinkProps;
};

/**
 * HOC that wraps any Link component and makes it a navigation Link.
 */
export const withLink = <T extends Partial<LinkProps>>(
  Component: React.ComponentType<T>
): React.FC<Omit<T, keyof LinkProps> & WrappedLinkProps> =>
  React.memo(function WithLink({ app, id, path, urlState, onClick: _onClick, ...rest }) {
    const getLink = useGetLinkProps();
    const getLinkPropsParams: GetLinkPropsParams = { app, id, path, urlState, onClick: _onClick };
    const { onClick, href } = getLink({
      ...getLinkPropsParams,
      ...(rest.target === '_blank' && { skipKibanaNavigation: true }),
    });
    return <Component onClick={onClick} href={href} {...(rest as unknown as T)} />;
  });

/**
 * Security Solutions internal link button.
 *
 * `<LinkButton deepLinkId={SecurityPageName.hosts} />;`
 */
export const LinkButton = withLink(EuiButton);

/**
 * Security Solutions internal link anchor.
 *
 * `<LinkAnchor deepLinkId={SecurityPageName.hosts} />;`
 */
export const LinkAnchor = withLink<EuiLinkProps>(EuiLink);

// Utils

export const formatPath = (path: string, urlState: string) => {
  const urlStateClean = urlState.replace('?', '');
  const [urlPath, parameterPath] = path.split('?');
  let queryParams = '';
  if (urlStateClean && parameterPath) {
    queryParams = `?${parameterPath}&${urlStateClean}`;
  } else if (parameterPath) {
    queryParams = `?${parameterPath}`;
  } else if (urlStateClean) {
    queryParams = `?${urlStateClean}`;
  }
  return `${urlPath}${queryParams}`;
};

export const isModifiedEvent = (event: MouseEvent) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

export const securityLink = (pageName: SecurityPageName): AppDeepLinkId => {
  return `${SECURITY_UI_APP_ID}:${pageName}`;
};
