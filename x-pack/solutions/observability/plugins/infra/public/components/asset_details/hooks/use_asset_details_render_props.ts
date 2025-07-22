/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import type { AssetDetailsProps } from '../types';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';
import { useMetadataStateContext } from './use_metadata_state';

export type UseAssetDetailsRenderProps = Pick<
  AssetDetailsProps,
  'entityId' | 'entityName' | 'entityType' | 'overrides' | 'renderMode'
>;

export function useAssetDetailsRenderProps(props: UseAssetDetailsRenderProps) {
  const [urlState] = useAssetDetailsUrlState();
  const { metadata } = useMetadataStateContext();
  const { entityId, entityName, entityType, ...rest } = props;

  // When the asset entity.name is known we can load the page faster
  // Otherwise we need to use metadata response.
  const loading = !entityName && !urlState?.name && !metadata?.name;
  return {
    ...rest,
    entity: {
      id: entityId,
      name: entityName || urlState?.name || metadata?.name || '',
      type: entityType,
    },
    loading,
  };
}

export const AssetDetailsRenderProps = createContainer(useAssetDetailsRenderProps);
export const [AssetDetailsRenderPropsProvider, useAssetDetailsRenderPropsContext] =
  AssetDetailsRenderProps;
