/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';
import rison from '@kbn/rison';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  ASSET_DETAILS_LOCATOR_ID,
  type AssetDetailsLocatorParams,
  SupportedAssetTypes,
} from '@kbn/observability-shared-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { type AssetDetailsUrlState } from '../../components/asset_details/types';
import { ASSET_DETAILS_URL_STATE_KEY } from '../../components/asset_details/constants';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

export const REDIRECT_NODE_DETAILS_FROM_KEY = 'from';
export const REDIRECT_NODE_DETAILS_TO_KEY = 'to';
export const REDIRECT_ASSET_DETAILS_KEY = 'assetDetails';

const getAssetDetailsQueryParams = (queryParams: URLSearchParams) => {
  const from = queryParams.get(REDIRECT_NODE_DETAILS_FROM_KEY);
  const to = queryParams.get(REDIRECT_NODE_DETAILS_TO_KEY);
  const assetDetailsParam = queryParams.get(REDIRECT_ASSET_DETAILS_KEY);

  return {
    [ASSET_DETAILS_URL_STATE_KEY]: {
      ...(assetDetailsParam
        ? (rison.decode(assetDetailsParam) as AssetDetailsUrlState)
        : undefined),
      dateRange: {
        from: from ? new Date(parseFloat(from)).toISOString() : undefined,
        to: to ? new Date(parseFloat(to)).toISOString() : undefined,
      },
    },
  } as AssetDetailsUrlState;
};

const getNodeDetailSearch = (queryParams: URLSearchParams) => {
  const from = queryParams.get(REDIRECT_NODE_DETAILS_FROM_KEY);
  const to = queryParams.get(REDIRECT_NODE_DETAILS_TO_KEY);

  return {
    _a: {
      time:
        from && to
          ? {
              from: new Date(parseFloat(from)).toISOString(),
              interval: '>=1m',
              to: new Date(parseFloat(to)).toISOString(),
            }
          : undefined,
    },
  };
};

export const getSearchParams = (nodeType: InventoryItemType, queryParams: URLSearchParams) =>
  Object.values(SupportedAssetTypes).includes(nodeType as SupportedAssetTypes)
    ? getAssetDetailsQueryParams(queryParams)
    : getNodeDetailSearch(queryParams);

export const RedirectToNodeDetail = () => {
  const {
    params: { nodeType, nodeId },
  } = useRouteMatch<{ nodeType: InventoryItemType; nodeId: string }>();
  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const location = useLocation();
  const baseLocator = share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const search = getSearchParams(nodeType, queryParams);

    baseLocator?.navigate({
      ...search,
      assetType: nodeType,
      assetId: nodeId,
      state: location.state as SerializableRecord,
    });
  }, [baseLocator, location.search, location.state, nodeId, nodeType]);

  return null;
};
