/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { getRouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import {
  type AssetDetailsLocatorParams,
  ASSET_DETAILS_LOCATOR_ID,
} from '@kbn/observability-shared-plugin/common';
import type { DataSchemaFormat, InventoryItemType } from '../../../common/inventory_models/types';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { RouteState } from '../../types';

interface QueryParams {
  from?: number | string;
  to?: number | string;
  name?: string;
}

export const useAssetDetailsRedirect = () => {
  const location = useLocation();
  const {
    services: {
      application: { currentAppId$ },
      share,
    },
  } = useKibanaContextForPlugin();

  const appId = useObservable(currentAppId$);
  const locator = share?.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const getAssetDetailUrl = useCallback(
    ({
      entityType,
      entityId,
      search,
      preferredSchema,
    }: {
      entityType: InventoryItemType;
      entityId: string;
      search: QueryParams;
      preferredSchema?: DataSchemaFormat;
    }): RouterLinkProps => {
      const { to, from, ...rest } = search;
      const fromStr = typeof from === 'number' ? new Date(from).toISOString() : from;
      const toStr = typeof to === 'number' ? new Date(to).toISOString() : to;
      const queryParams = {
        assetDetails:
          Object.keys(rest).length > 0
            ? {
                ...rest,
                ...(fromStr && toStr ? { dateRange: { from: fromStr, to: toStr } } : undefined),
                preferredSchema: preferredSchema ?? 'semconv',
              }
            : {},
        _a: {
          time: {
            ...(fromStr ? { from: fromStr } : undefined),
            ...(toStr ? { to: toStr } : undefined),
            interval: '>=1m',
          },
        },
      };

      const assetDetailsLocatorParams = {
        ...queryParams,
        entityType,
        entityId,
        state: {
          ...(location.state ?? {}),
          ...(location.key
            ? ({
                originAppId: appId,
                originSearch: location.search,
                originPathname: location.pathname,
              } as RouteState)
            : {}),
        },
      };

      const assetDetailsLinkProps = getRouterLinkProps({
        href: locator?.getRedirectUrl(assetDetailsLocatorParams),
        onClick: () => {
          locator?.navigate(assetDetailsLocatorParams, { replace: false });
        },
      });

      return assetDetailsLinkProps;
    },
    [appId, location.key, location.pathname, location.search, location.state, locator]
  );

  return { getAssetDetailUrl };
};
