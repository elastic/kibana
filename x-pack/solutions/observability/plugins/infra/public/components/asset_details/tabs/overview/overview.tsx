/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  MetadataSummaryList,
  MetadataSummaryListCompact,
} from './metadata_summary/metadata_summary_list';
import { AlertsSummaryContent } from './alerts/alerts';
import { KPIGrid } from './kpis/kpi_grid';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { MetadataErrorCallout } from '../../components/metadata_error_callout';
import { CpuProfilingPrompt } from './kpis/cpu_profiling_prompt';
import { ServicesContent } from './services';
import { MetricsContent } from './metrics/metrics';

export const Overview = () => {
  const { dateRange } = useDatePickerContext();
  const { entity, renderMode } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateContext();
  const { metrics } = useDataViewsContext();
  const isFullPageView = renderMode.mode === 'page';

  const metadataSummarySection = isFullPageView ? (
    <MetadataSummaryList metadata={metadata} loading={metadataLoading} entityType={entity.type} />
  ) : (
    <MetadataSummaryListCompact
      metadata={metadata}
      loading={metadataLoading}
      entityType={entity.type}
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <KPIGrid
          entityId={entity.id}
          entityType={entity.type}
          dateRange={dateRange}
          dataView={metrics.dataView}
        />
        {entity.type === 'host' ? <CpuProfilingPrompt /> : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {fetchMetadataError && !metadataLoading ? <MetadataErrorCallout /> : metadataSummarySection}
        <SectionSeparator />
      </EuiFlexItem>
      {entity.type === 'host' || entity.type === 'container' ? (
        <EuiFlexItem grow={false}>
          <AlertsSummaryContent
            entityId={entity.id}
            entityType={entity.type}
            dateRange={dateRange}
          />
          <SectionSeparator />
        </EuiFlexItem>
      ) : null}
      {entity.type === 'host' ? (
        <EuiFlexItem grow={false}>
          <ServicesContent hostName={entity.id} dateRange={dateRange} />
          <SectionSeparator />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <MetricsContent
          entityId={entity.id}
          entityType={entity.type}
          dateRange={dateRange}
          dataView={metrics.dataView}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SectionSeparator = () => (
  <EuiHorizontalRule
    margin="m"
    css={css`
      margin-bottom: 0;
    `}
  />
);
