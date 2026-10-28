/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { METRICS_APP } from '../../common/constants';
import { inventoryTitle, metricsTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

export interface UseMetricsBreadcrumbsOptions {
  /**
   * Parent crumb used by Chrome Next's compatibility back control.
   * - `app`: non-linkable Infrastructure group label (Inventory, Hosts, Explorer, Settings, details).
   * - `inventory`: linkable Infrastructure Inventory parent.
   * - `none`: do not prepend a parent.
   */
  parent?: 'app' | 'inventory' | 'none';
}

export const useMetricsBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  { parent = 'app' }: UseMetricsBreadcrumbsOptions = {}
) => {
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();
  const inventoryLinkProps = useLinkProps({
    app: METRICS_APP,
    pathname: 'inventory',
  });

  let parentCrumb: ChromeBreadcrumb | undefined;
  if (parent === 'app') {
    parentCrumb = { text: metricsTitle };
  } else if (parent === 'inventory') {
    parentCrumb = {
      ...inventoryLinkProps,
      text: inventoryTitle,
    };
  }

  const breadcrumbs = parentCrumb ? [parentCrumb, ...extraCrumbs] : extraCrumbs;

  useBreadcrumbs(breadcrumbs, { serverless });
};
