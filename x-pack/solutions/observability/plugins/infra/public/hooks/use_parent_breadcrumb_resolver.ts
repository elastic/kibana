/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteState } from '@kbn/metrics-data-access-plugin/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useLocation } from 'react-router-dom';
import type { LinkProps } from '@kbn/observability-shared-plugin/public/hooks/use_link_props';
import { METRICS_APP } from '../../common/constants';
import { hostsTitle, inventoryTitle, metricsExplorerTitle } from '../translations';
import { applyOriginSearchToParentLink } from './apply_origin_search_to_parent_link';
import { useKibanaContextForPlugin } from './use_kibana';
import {
  resolveParentBreadcrumbOption,
  type ParentBreadcrumbOption,
} from './resolve_parent_breadcrumb_option';

type BreadcrumbOptions = ParentBreadcrumbOption<LinkProps>;

export function useParentBreadcrumbResolver() {
  const {
    services: {
      application: { navigateToApp },
    },
  } = useKibanaContextForPlugin();

  const hostsLinkProps = useLinkProps({
    app: METRICS_APP,
    pathname: 'hosts',
  });

  const inventoryLinkProps = useLinkProps({
    app: METRICS_APP,
    pathname: 'inventory',
  });

  const explorerLinkProps = useLinkProps({
    app: METRICS_APP,
    pathname: 'explorer',
  });

  const breadcrumbMap = new Map<string, BreadcrumbOptions>([
    ['/hosts', { text: hostsTitle, link: hostsLinkProps }],
    ['/inventory', { text: inventoryTitle, link: inventoryLinkProps }],
    ['/explorer', { text: metricsExplorerTitle, link: explorerLinkProps }],
  ]);

  const defaultOption: BreadcrumbOptions = breadcrumbMap.get('/inventory')!;

  const { state } = useLocation();
  // Intentional `as Partial<RouteState>` type assertion as react-router location.state is untyped at the history boundary;
  const locationState = state as Partial<RouteState> | undefined;

  function getBreadcrumbOptions() {
    const option = resolveParentBreadcrumbOption({
      originPathname: locationState?.originPathname,
      breadcrumbMap,
      defaultOption,
    });

    const { originAppId, originPathname, originSearch } = locationState ?? {};
    if (!originAppId || !originPathname || !originSearch || !breadcrumbMap.has(originPathname)) {
      return option;
    }

    return {
      text: option.text,
      link: applyOriginSearchToParentLink({
        link: option.link,
        originAppId,
        originPathname,
        originSearch,
        navigateToApp,
      }),
    };
  }

  return { getBreadcrumbOptions };
}
