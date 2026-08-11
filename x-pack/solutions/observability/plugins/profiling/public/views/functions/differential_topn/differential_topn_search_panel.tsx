/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { PrimaryAndComparisonSearchBar } from '../../../components/primary_and_comparison_search_bar';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import type { NormalizationOptions } from '../../../components/normalization_menu';
import { NormalizationMode, NormalizationMenu } from '../../../components/normalization_menu';

export function DifferentialTopNSearchPanel() {
  const {
    query,
    query: {
      rangeFrom,
      rangeTo,
      comparisonRangeFrom,
      comparisonRangeTo,
      baseline = 1,
      comparison = 1,
      normalizationMode,
    },
  } = useProfilingParams('/functions/differential');
  const routePath = useProfilingRoutePath();
  const profilingRouter = useProfilingRouter();

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const comparisonTimeRange = useTimeRange({
    rangeFrom: comparisonRangeFrom,
    rangeTo: comparisonRangeTo,
    optional: true,
  });

  const totalSeconds = timeRange.inSeconds.end - timeRange.inSeconds.start;
  const totalComparisonSeconds =
    comparisonTimeRange.inSeconds.end !== undefined &&
    comparisonTimeRange.inSeconds.start !== undefined
      ? comparisonTimeRange.inSeconds.end - comparisonTimeRange.inSeconds.start
      : totalSeconds;

  const baselineTime = 1;
  const comparisonTime = totalSeconds / totalComparisonSeconds;

  const normalizationOptions: NormalizationOptions = {
    baselineScale: baseline,
    baselineTime,
    comparisonScale: comparison,
    comparisonTime,
  };

  function onChangeNormalizationMode(
    nextNormalizationMode: NormalizationMode,
    options: NormalizationOptions
  ) {
    profilingRouter.push(routePath, {
      path: routePath,
      query:
        nextNormalizationMode === NormalizationMode.Scale
          ? {
              ...query,
              baseline: options.baselineScale,
              comparison: options.comparisonScale,
              normalizationMode: nextNormalizationMode,
            }
          : {
              ...query,
              normalizationMode: nextNormalizationMode,
            },
    });
  }

  return (
    <EuiFlexGroup direction="column">
      <PrimaryAndComparisonSearchBar />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <NormalizationMenu
              onChange={onChangeNormalizationMode}
              mode={normalizationMode}
              options={normalizationOptions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
