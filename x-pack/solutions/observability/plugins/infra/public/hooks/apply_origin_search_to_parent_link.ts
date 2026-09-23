/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldHandleLinkEvent } from '@kbn/observability-shared-plugin/public';
import type { LinkProps } from '@kbn/observability-shared-plugin/public/hooks/use_link_props';

/**
 * Appends the recorded origin query string to a parent breadcrumb link so Chrome Next
 * compatibility back restores filters, grouping, and date range from the origin page.
 */
export function applyOriginSearchToParentLink({
  link,
  originAppId,
  originPathname,
  originSearch,
  navigateToApp,
}: {
  link: LinkProps;
  originAppId: string;
  originPathname: string;
  originSearch: string;
  navigateToApp: (appId: string, options: { path?: string; replace?: boolean }) => void;
}): LinkProps {
  const search = originSearch.startsWith('?') ? originSearch : `?${originSearch}`;
  const hrefBase = link.href?.split('?')[0] ?? '';
  const href = `${hrefBase}${search}`;
  const path = `${originPathname}${search}`;

  return {
    href,
    onClick: (e) => {
      if (!shouldHandleLinkEvent(e)) {
        return;
      }
      e.preventDefault();
      navigateToApp(originAppId, { path, replace: true });
    },
  };
}
