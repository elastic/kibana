/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  type SnapshotMetricType,
  findInventoryModel,
  SnapshotMetricTypeKeys,
} from '@kbn/metrics-data-access-plugin/common';
import { useAssetDetailsUrlState } from '../hooks/use_asset_details_url_state';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { LegacyAlertMetricCallout } from './callouts/legacy_metric_callout';
import { ContentTabIds } from '../types';

const INCOMING_ALERT_CALLOUT_VISIBLE_FOR = [ContentTabIds.OVERVIEW, ContentTabIds.METRICS];

export const isSnapshotMetricType = (value?: string): value is SnapshotMetricType => {
  return value != null && value in SnapshotMetricTypeKeys;
};

export const Callouts = () => {
  const { entity } = useAssetDetailsRenderPropsContext();
  const [state] = useAssetDetailsUrlState();

  const entityConfig = findInventoryModel(entity.type);
  const alertMetric = isSnapshotMetricType(state?.alertMetric) ? state?.alertMetric : undefined;

  if (
    entity.type === 'host' &&
    alertMetric &&
    entityConfig.metrics.legacyMetrics?.includes(alertMetric)
  ) {
    return (
      <LegacyAlertMetricCallout
        visibleFor={INCOMING_ALERT_CALLOUT_VISIBLE_FOR}
        metric={alertMetric}
      />
    );
  }

  return null;
};
