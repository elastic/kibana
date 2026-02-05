/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useInstalledIntegration } from './use_installed_integration';
import { useTimeRangeMetadataContext } from './use_time_range_metadata';

export const useKubernetesDashboardPromotion = (nodeType: InventoryItemType) => {
  const { data: timeRangeMetadata } = useTimeRangeMetadataContext();

  const schemas: DataSchemaFormat[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata?.schemas]
  );

  const isPodNodeType = nodeType === 'pod';
  const hasEcsSchema = schemas.includes('ecs');
  const hasSemconvSchema = schemas.includes('semconv');

  const { isInstalled: hasEcsK8sIntegration, isLoading: isEcsLoading } = useInstalledIntegration(
    'kubernetes',
    isPodNodeType && hasEcsSchema
  );

  const { isInstalled: hasSemconvK8sIntegration, isLoading: isSemconvLoading } =
    useInstalledIntegration('kubernetes_otel', isPodNodeType && hasSemconvSchema);

  return {
    hasEcsSchema,
    hasSemconvSchema,
    hasEcsK8sIntegration,
    hasSemconvK8sIntegration,
    isLoading: isEcsLoading || isSemconvLoading,
  };
};
