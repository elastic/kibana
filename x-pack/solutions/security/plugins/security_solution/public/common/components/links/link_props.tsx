/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type MouseEventHandler } from 'react';
import { useGetLinkProps, withLink, type LinkProps } from '@kbn/security-solution-navigation/links';
import { useGetUrlStateQueryParams } from '../navigation/use_url_state_query_params';
import type { SecurityPageName } from '../../../../common/constants';

interface SecuritySolutionLinkProps {
  deepLinkId: SecurityPageName;
  path?: string;
}

type GetSecuritySolutionLinkPropsParams = SecuritySolutionLinkProps & {
  /**
   * Optional `onClick` callback prop.
   * It is composed within the returned `onClick` function to perform extra actions when the link is clicked.
   * It does not override the navigation operation.
   **/
  onClick?: MouseEventHandler;
};

export type GetSecuritySolutionLinkProps = (
  params: GetSecuritySolutionLinkPropsParams
) => LinkProps;

/**
 * It returns a function to get the `onClick` and `href` props to use in link components
 * based on the` deepLinkId` and `path` parameters.
 */
export const useGetSecuritySolutionLinkProps = (): GetSecuritySolutionLinkProps => {
  const getLinkProps = useGetLinkProps();
  const getUrlStateQueryParams = useGetUrlStateQueryParams();

  const getSecuritySolutionLinkProps = useCallback<GetSecuritySolutionLinkProps>(
    ({ deepLinkId, path, onClick }) => {
      const urlState = getUrlStateQueryParams(deepLinkId);
      return getLinkProps({ id: deepLinkId, path, urlState, onClick });
    },
    [getLinkProps, getUrlStateQueryParams]
  );

  return getSecuritySolutionLinkProps;
};

/**
 * It returns the `onClick` and `href` props to use in link components
 * based on the` deepLinkId` and `path` parameters.
 */
export const useSecuritySolutionLinkProps: GetSecuritySolutionLinkProps = ({
  deepLinkId,
  path,
  onClick,
}) => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const securitySolutionLinkProps = useMemo<LinkProps>(
    () => getSecuritySolutionLinkProps({ deepLinkId, path, onClick }),
    [getSecuritySolutionLinkProps, deepLinkId, path, onClick]
  );
  return securitySolutionLinkProps;
};

const withSecuritySolutionLinkProps = <T extends { id: string; urlState?: string }>(
  WrappedComponent: React.ComponentType<T>
): React.FC<Omit<T, 'id' | 'urlState'> & { deepLinkId: SecurityPageName }> =>
  React.memo(function WithSecuritySolutionProps({ deepLinkId, ...rest }) {
    const getUrlStateQueryParams = useGetUrlStateQueryParams();
    const urlState = getUrlStateQueryParams(deepLinkId);
    return <WrappedComponent {...({ id: deepLinkId, urlState, ...rest } as unknown as T)} />;
  });

/**
 * HOC that wraps any Link component and makes it a Security solutions internal navigation Link.
 */
export const withSecuritySolutionLink = <T extends Partial<LinkProps>>(
  WrappedComponent: React.ComponentType<T>
) => withSecuritySolutionLinkProps(withLink(WrappedComponent));
