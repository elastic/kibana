/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStackTraces } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { TopNType } from '@kbn/profiling-utils';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { ProfilingLinks } from './profiling_links';

interface Props {
  kuery: string;
}

export function Threads({ kuery }: Props) {
  const { services } = useKibanaContextForPlugin();
  const { getDateRangeInTimestamp, dateRange, setDateRange } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();
  const { asset } = useAssetDetailsRenderPropsContext();
  const stacktracesProfilingLinkLocator =
    services.observabilityShared.locators.profiling.stacktracesLocator;

  return (
    <>
      <ProfilingLinks
        hostname={asset.name}
        from={dateRange.from}
        to={dateRange.to}
        profilingLinkLocator={stacktracesProfilingLinkLocator}
        profilingLinkLabel={i18n.translate('xpack.infra.flamegraph.profilingAppThreadsLink', {
          defaultMessage: 'Go to Universal Profiling Threads',
        })}
      />
      <EuiSpacer />
      <EmbeddableStackTraces
        type={TopNType.Threads}
        rangeFrom={from}
        rangeTo={to}
        kuery={kuery}
        onClick={(category) => {
          stacktracesProfilingLinkLocator.navigate({
            type: TopNType.Traces,
            rangeFrom: dateRange.from,
            rangeTo: dateRange.to,
            kuery: `(${kuery}) AND process.thread.name:"${category}"`,
          });
        }}
        onChartBrushEnd={(range) => {
          setDateRange({ from: range.rangeFrom, to: range.rangeTo });
        }}
      />
    </>
  );
}
