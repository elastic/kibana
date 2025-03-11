/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { type IndicesStatsIndexMetadataState } from '@elastic/elasticsearch/lib/api/types';
import type { Index } from '@kbn/index-management-shared-types';

import { i18n } from '@kbn/i18n';

import { QuickStat, type QuickStatDefinition } from './quick_stat';
import {
  indexHealthToHealthColor,
  HealthStatusStrings,
  normalizeHealth,
} from '../../utils/indices';

export const healthTitleMap: Record<HealthStatusStrings, string> = {
  red: i18n.translate('xpack.searchIndices.quickStats.indexHealth.red', { defaultMessage: 'Red' }),
  green: i18n.translate('xpack.searchIndices.quickStats.indexHealth.green', {
    defaultMessage: 'Green',
  }),
  yellow: i18n.translate('xpack.searchIndices.quickStats.indexHealth.yellow', {
    defaultMessage: 'Yellow',
  }),
  unavailable: i18n.translate('xpack.searchIndices.quickStats.indexHealth.unavailable', {
    defaultMessage: 'Unavailable',
  }),
};
export const statusDescriptionMap: Record<IndicesStatsIndexMetadataState | 'undefined', string> = {
  open: i18n.translate('xpack.searchIndices.quickStats.indexStatus.open', {
    defaultMessage: 'Index available',
  }),
  close: i18n.translate('xpack.searchIndices.quickStats.indexStatus.close', {
    defaultMessage: 'Index unavailable',
  }),
  undefined: i18n.translate('xpack.searchIndices.quickStats.indexStatus.undefined', {
    defaultMessage: 'Unknown',
  }),
};

export interface IndexStatusStatProps {
  index: Index;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function safelyParseShardCount(count: string | number) {
  if (typeof count === 'number') return count;
  const parsedValue = parseInt(count, 10);
  if (!isNaN(parsedValue)) return parsedValue;
  return undefined;
}

export const IndexStatusStat = ({ index, open, setOpen }: IndexStatusStatProps) => {
  const { replicaShards, stats: indexStats } = useMemo(() => {
    let primaryShardCount: number | undefined;
    let replicaShardCount: number | undefined;
    const stats: QuickStatDefinition[] = [
      {
        title: i18n.translate('xpack.searchIndices.quickStats.indexStatus.title', {
          defaultMessage: 'Status',
        }),
        description: statusDescriptionMap[index.status ?? 'undefined'],
      },
    ];
    if (index.primary) {
      primaryShardCount = safelyParseShardCount(index.primary);
      stats.push({
        title: i18n.translate('xpack.searchIndices.quickStats.indexStatus.primary', {
          defaultMessage: 'Primary shards',
        }),
        description: index.primary,
      });
    }
    if (index.replica) {
      replicaShardCount = safelyParseShardCount(index.replica);
      stats.push({
        title: i18n.translate('xpack.searchIndices.quickStats.indexStatus.replica', {
          defaultMessage: 'Replica shards',
        }),
        description: index.replica,
      });
    }

    return { stats, primaryShards: primaryShardCount, replicaShards: replicaShardCount };
  }, [index]);
  return (
    <QuickStat
      open={open}
      setOpen={setOpen}
      icon="dot"
      iconColor={indexHealthToHealthColor(index.health)}
      title={healthTitleMap[normalizeHealth(index.health ?? 'unavailable')]}
      secondaryTitle={
        index.replica &&
        i18n.translate('xpack.searchIndices.quickStats.indexStatus.replicaTitle', {
          defaultMessage: '{replicaShards, plural, one {# Replica} other {# Replicas}}',
          values: {
            replicaShards,
          },
        })
      }
      data-test-subj="QuickStatsIndexStatus"
      stats={indexStats}
      statsColumnWidths={[2, 2]}
    />
  );
};
