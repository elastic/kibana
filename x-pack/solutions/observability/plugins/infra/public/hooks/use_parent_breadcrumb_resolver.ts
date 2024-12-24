/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common/inventory_models/types';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useLocation } from 'react-router-dom';
import type { LinkProps } from '@kbn/observability-shared-plugin/public/hooks/use_link_props';
import { hostsTitle, inventoryTitle } from '../translations';

interface LocationStateProps {
  originPathname: string;
}

interface BreadcrumbOptions {
  text: string;
  link: LinkProps;
}

export function useParentBreadcrumbResolver() {
  const hostsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'hosts',
  });

  const inventoryLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'inventory',
  });

  const breadcrumbMap = new Map<string, BreadcrumbOptions>([
    ['/hosts', { text: hostsTitle, link: hostsLinkProps }],
    ['/inventory', { text: inventoryTitle, link: inventoryLinkProps }],
  ]);

  const defaultOption: BreadcrumbOptions = breadcrumbMap.get('/inventory')!;

  const { state } = useLocation();
  const locationState: LocationStateProps = state as LocationStateProps;

  function getOptionsByNodeType(nodeType: InventoryItemType): BreadcrumbOptions {
    if (nodeType === 'host') {
      return breadcrumbMap.get('/hosts')!;
    }
    return defaultOption;
  }

  function getBreadcrumbOptions(nodeType: InventoryItemType) {
    if (locationState === undefined) {
      return getOptionsByNodeType(nodeType);
    }

    const originalPathBreadcrumb = locationState.originPathname
      ? breadcrumbMap.get(locationState.originPathname)
      : undefined;

    return originalPathBreadcrumb ?? defaultOption;
  }

  return { getBreadcrumbOptions };
}
