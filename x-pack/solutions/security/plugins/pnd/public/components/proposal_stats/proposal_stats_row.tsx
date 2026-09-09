/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useProposalStats } from '../../hooks/use_proposal_stats';
import { STAT_PANELS } from './constants';
import { ProposalStatCard } from './proposal_stat_card';

/**
 * Horizontal row of three stat cards (Respond, Investigate, Configure).
 * Fetches bucketed open-proposal counts from the API and distributes them per
 * panel. Renders nothing on error so a stats failure cannot break the queue
 * below it.
 */
export const ProposalStatsRow: React.FC = () => {
  const { data, isLoading, error } = useProposalStats();

  // Silently hide on error — the queue below is the primary surface.
  if (error && !isLoading) {
    return null;
  }

  const buckets = data?.buckets ?? [];
  const lastBucket = buckets[buckets.length - 1];

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} data-test-subj="pndProposalStatsRow">
      {STAT_PANELS.map(({ id, category, label, color }) => {
        const series = buckets.map((b) => ({
          x: b.timestamp,
          y: b.counts[category] ?? 0,
        }));
        const count = lastBucket?.counts[category] ?? 0;

        return (
          <EuiFlexItem key={id}>
            <ProposalStatCard
              id={id}
              label={label}
              color={color}
              count={count}
              series={series}
              isLoading={isLoading}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
