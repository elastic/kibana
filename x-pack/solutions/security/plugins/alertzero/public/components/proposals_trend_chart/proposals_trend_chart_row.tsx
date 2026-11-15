/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  DEFAULT_BUCKET_MINUTES,
  DEFAULT_WINDOW_HOURS,
  useProposalChartsSummary,
} from '../../hooks/use_proposal_charts_summary';
import { TREND_CHART_PANELS } from './constants';
import { ProposalsTrendChartCard } from './proposals_trend_chart_card';
import type { SparklinePoint } from './trend_sparkline';

/**
 * The window is not a prop: no caller varies it today, and a prop nothing sets
 * is a second place for the fetched window and the rendered one to disagree.
 * Thread it through when a caller actually needs a different one.
 */
export const ProposalsTrendChartRow: React.FC = () => {
  const { data, isLoading, error } = useProposalChartsSummary();

  const buckets = data?.buckets;
  // Derived once per fetch: the sparklines key their work on these arrays, so rebuilding them
  // on every page render would defeat that and hand the charts new identities each time.
  const { seriesById, countById, sharedYMax } = useMemo(() => {
    const rows = buckets ?? [];
    const lastBucket = rows[rows.length - 1];
    const series: Record<string, SparklinePoint[]> = {};
    const counts: Record<string, number> = {};
    let peak = 0;
    for (const { id } of TREND_CHART_PANELS) {
      series[id] = rows.map((bucket) => ({ x: bucket.timestamp, y: bucket.counts[id] ?? 0 }));
      counts[id] = lastBucket?.counts[id] ?? 0;
      // One scale across the row so the three sparklines compare at "Now".
      peak = series[id].reduce((max, point) => Math.max(max, point.y), peak);
    }
    return { seriesById: series, countById: counts, sharedYMax: peak };
  }, [buckets]);

  // Hide rather than error out: the queue below is the primary surface. Gated on
  // `!data` so keepPreviousData keeps the cards up through a transient refetch failure.
  if (error && !data) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="stretch"
      responsive={false}
      data-test-subj="alertZeroProposalsTrendChartRow"
    >
      {TREND_CHART_PANELS.map(({ id, label, color }) => {
        return (
          <EuiFlexItem key={id}>
            <ProposalsTrendChartCard
              id={id}
              label={label}
              color={color}
              count={countById[id]}
              series={seriesById[id]}
              isLoading={isLoading}
              windowHours={DEFAULT_WINDOW_HOURS}
              bucketMinutes={DEFAULT_BUCKET_MINUTES}
              yMax={sharedYMax}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
