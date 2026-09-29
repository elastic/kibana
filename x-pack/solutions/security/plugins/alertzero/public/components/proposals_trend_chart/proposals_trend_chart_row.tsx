/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  DEFAULT_BUCKET_MINUTES,
  DEFAULT_WINDOW_HOURS,
  useProposalChartsSummary,
} from '../../hooks/use_proposal_charts_summary';
import { TREND_CHART_PANELS } from './constants';
import { ProposalsTrendChartCard } from './proposals_trend_chart_card';

/**
 * The window is not a prop: no caller varies it today, and a prop nothing sets
 * is a second place for the fetched window and the rendered one to disagree.
 * Thread it through when a caller actually needs a different one.
 */
export const ProposalsTrendChartRow: React.FC = () => {
  const { data, isLoading, error } = useProposalChartsSummary();

  // Hide rather than error out: the queue below is the primary surface. Gated on
  // `!data` so keepPreviousData keeps the cards up through a transient refetch failure.
  if (error && !data) {
    return null;
  }

  const buckets = data?.buckets ?? [];
  const lastBucket = buckets[buckets.length - 1];

  return (
    <EuiFlexGroup
      gutterSize="m"
      responsive={false}
      data-test-subj="alertZeroProposalsTrendChartRow"
    >
      {TREND_CHART_PANELS.map(({ id, label, color }) => {
        const series = buckets.map((b) => ({
          x: b.timestamp,
          y: b.counts[id] ?? 0,
        }));
        const count = lastBucket?.counts[id] ?? 0;

        return (
          <EuiFlexItem key={id}>
            <ProposalsTrendChartCard
              id={id}
              label={label}
              color={color}
              count={count}
              series={series}
              isLoading={isLoading}
              windowHours={DEFAULT_WINDOW_HOURS}
              bucketMinutes={DEFAULT_BUCKET_MINUTES}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
