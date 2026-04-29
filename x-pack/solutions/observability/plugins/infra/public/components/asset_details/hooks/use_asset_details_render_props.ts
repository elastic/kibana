/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useEffect, useMemo } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import type { AssetDetailsProps } from '../types';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';
import { useMetadataStateContext } from './use_metadata_state';
import { useTimeRangeMetadataContext } from '../../../hooks/use_time_range_metadata';
import { isPending } from '../../../hooks/use_fetcher';

export type UseAssetDetailsRenderProps = Pick<
  AssetDetailsProps,
  'entityId' | 'entityName' | 'entityType' | 'overrides' | 'renderMode' | 'preferredSchema'
>;

export function useAssetDetailsRenderProps(props: UseAssetDetailsRenderProps) {
  const [urlState] = useAssetDetailsUrlState();
  const { metadata } = useMetadataStateContext();
  const { data: timeRangeMetadata, status } = useTimeRangeMetadataContext();
  const { updateTopbarMenuVisibilityBySchema } = useInfraMLCapabilitiesContext();
  const { entityId, entityName, entityType, ...rest } = props;

  const schema = useMemo<DataSchemaFormat | null>(() => {
    if (!timeRangeMetadata) return null;
    return timeRangeMetadata.preferredSchema;
  }, [timeRangeMetadata]);

  const contextSchema = props.preferredSchema ? props.preferredSchema : urlState?.preferredSchema;
  const selectedSchema =
    timeRangeMetadata?.schemas && timeRangeMetadata?.schemas.length > 1 && contextSchema
      ? contextSchema
      : schema;

  useEffect(() => {
    updateTopbarMenuVisibilityBySchema(selectedSchema);
  }, [selectedSchema, updateTopbarMenuVisibilityBySchema]);

  const isLoadingTimeRangeMetadata = isPending(status);

  // When the asset entity.name is known we can load the page faster
  // Otherwise we need to use metadata response.
  const loading = (!entityName && !urlState?.name && !metadata?.name) || isLoadingTimeRangeMetadata;

  return {
    ...rest,
    entity: {
      id: entityId,
      name: entityName || urlState?.name || metadata?.name || '',
      type: entityType,
    },
    schema: selectedSchema,
    loading,
  };
}

export const AssetDetailsRenderProps = createContainer(useAssetDetailsRenderProps);
export const [AssetDetailsRenderPropsProvider, useAssetDetailsRenderPropsContext] =
  AssetDetailsRenderProps;
