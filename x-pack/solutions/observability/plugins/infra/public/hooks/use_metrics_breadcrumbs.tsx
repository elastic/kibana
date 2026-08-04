/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { METRICS_APP } from '../../common/constants';
import { inventoryTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

export interface UseMetricsBreadcrumbsOptions {
  /**
   * Parent crumb used by Chrome Next's compatibility back control.
   * - `inventory`: prepend Infrastructure Inventory (Hosts, Explorer, Settings).
   * - `none`: do not prepend a parent (Inventory home, and detail pages that supply their own parent).
   */
  parent?: 'inventory' | 'none';
}

export const useMetricsBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  { parent = 'inventory' }: UseMetricsBreadcrumbsOptions = {}
) => {
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();
  const inventoryLinkProps = useLinkProps({
    app: METRICS_APP,
    pathname: 'inventory',
  });

  const breadcrumbs =
    parent === 'none'
      ? extraCrumbs
      : [
          {
            ...inventoryLinkProps,
            text: inventoryTitle,
          },
          ...extraCrumbs,
        ];

  useBreadcrumbs(breadcrumbs, { serverless });
};
