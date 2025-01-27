/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { Route } from '@kbn/shared-ux-router';
import type { DocLinks } from '@kbn/doc-links';
import { NoPrivilegesPage } from '../../../common/components/no_privileges';

export interface PrivilegedRouteProps {
  path: string;
  component: ComponentType<{}>;
  hasPrivilege: boolean;
}

export const PrivilegedRoute = memo(({ component, hasPrivilege, path }: PrivilegedRouteProps) => {
  const docLinkSelector = useCallback((docLinks: DocLinks) => {
    return docLinks.securitySolution.privileges;
  }, []);

  const componentToRender = useMemo(() => {
    if (!hasPrivilege) {
      // eslint-disable-next-line react/display-name
      return () => <NoPrivilegesPage docLinkSelector={docLinkSelector} />;
    }

    return component;
  }, [component, docLinkSelector, hasPrivilege]);

  return <Route path={path} component={componentToRender} />;
});
PrivilegedRoute.displayName = 'PrivilegedRoute';
