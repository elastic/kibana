/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import createContainer from 'constate';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetadata } from './use_metadata';
import type { AssetDetailsProps } from '../types';
import { useDatePickerContext } from './use_date_picker';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';
import { useRequestObservable } from './use_request_observable';

export type UseMetadataProviderProps = Pick<AssetDetailsProps, 'entityId' | 'entityType'>;

export function useMetadataProvider({
  entityId: entityId,
  entityType: entityType,
}: UseMetadataProviderProps) {
  const { request$ } = useRequestObservable();
  const [, setUrlState] = useAssetDetailsUrlState();
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const { sourceId } = useSourceContext();

  const timeRange = useMemo(() => getDateRangeInTimestamp(), [getDateRangeInTimestamp]);

  const { loading, error, metadata, reload } = useMetadata({
    entityId,
    entityType,
    sourceId,
    timeRange,
    request$,
  });

  useEffect(() => {
    if (metadata?.name) {
      setUrlState({ name: metadata.name });
    }
  }, [metadata?.name, setUrlState]);

  return {
    loading,
    error,
    metadata,
    refresh: reload,
  };
}

export const [MetadataStateProvider, useMetadataStateContext] =
  createContainer(useMetadataProvider);
