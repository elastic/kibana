/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibanaServices } from './use_kibana_services';

/**
 * A link to Discover running an ES|QL query over a time range, or `undefined` when Discover isn't
 * available (no share plugin, no Discover locator, or no access to Discover).
 */
export const useDiscoverHref = (
  esql: string | undefined,
  timeRange: { from: string; to: string } | undefined
): string | undefined => {
  const { share, application } = useKibanaServices();
  const canOpenDiscover = Boolean(application.capabilities.discover_v2?.show);
  const locator = share?.url.locators.get(DISCOVER_APP_LOCATOR);

  return useMemo(
    () =>
      esql && timeRange && locator && canOpenDiscover
        ? locator.getRedirectUrl({ query: { esql }, timeRange })
        : undefined,
    [esql, timeRange, locator, canOpenDiscover]
  );
};
