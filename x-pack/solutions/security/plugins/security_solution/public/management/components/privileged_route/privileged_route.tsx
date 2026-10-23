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
import { AdministrationListPage } from '../administration_list_page';

export interface PrivilegedRouteProps {
  path: string;
  component: ComponentType<{}>;
  hasPrivilege: boolean;
  /** Page header title, also shown when the user lacks the privilege to see the page. */
  title: string;
  /** When true, the path must match the URL exactly (no extra trailing segments). */
  exact?: boolean;
}

export const PrivilegedRoute = memo(
  ({ component, hasPrivilege, path, title, exact }: PrivilegedRouteProps) => {
    const docLinkSelector = useCallback((docLinks: DocLinks) => {
      return docLinks.securitySolution.privileges;
    }, []);

    const componentToRender = useMemo(() => {
      if (!hasPrivilege) {
        // Keeps the page header (and its "Add integrations" menu item) on the no-privileges page,
        // since `GlobalHeader` doesn't mount its legacy action menu on these routes.
        // eslint-disable-next-line react/display-name
        return () => (
          <AdministrationListPage title={title}>
            <NoPrivilegesPage docLinkSelector={docLinkSelector} />
          </AdministrationListPage>
        );
      }

      return component;
    }, [component, docLinkSelector, hasPrivilege, title]);

    return <Route path={path} exact={exact} component={componentToRender} />;
  }
);
PrivilegedRoute.displayName = 'PrivilegedRoute';
