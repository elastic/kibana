/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiHealth,
  EuiIcon,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type {
  LocationShardStats,
  ShardStat,
} from '../../../../../../server/routes/settings/private_locations/get_shard_stats';
import { PolicyName } from './policy_name';

export const LocationShardDetails = ({
  stats,
  loading,
}: {
  stats?: LocationShardStats;
  loading: boolean;
}) => {
  if (loading && !stats) {
    return (
      <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
        <EuiLoadingSpinner size="m" /> {LOADING_LABEL}
      </EuiPanel>
    );
  }

  const shards = stats?.shards ?? [];
  const totalMonitors = shards.reduce((sum, shard) => sum + shard.monitors, 0);
  const healthyShards = shards.filter((shard) => shard.healthy).length;
  const isScalable = shards.length > 1;

  const columns: Array<EuiBasicTableColumn<ShardStat>> = [
    {
      field: 'policyId',
      name: SHARD_LABEL,
      render: (policyId: string) => <PolicyName agentPolicyId={policyId} />,
    },
    {
      field: 'monitors',
      name: MONITORS_LABEL,
      width: '90px',
      align: 'right',
      render: (monitors: number) => (
        <EuiText size="s" className="eui-textNoWrap">
          <strong>{monitors}</strong>
        </EuiText>
      ),
    },
    {
      field: 'monitors',
      name: DISTRIBUTION_COLUMN,
      width: '220px',
      render: (monitors: number, shard: ShardStat) => {
        const pct = totalMonitors > 0 ? Math.round((monitors / totalMonitors) * 100) : 0;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiProgress
                value={monitors}
                max={totalMonitors || 1}
                size="s"
                color={shard.healthy ? 'success' : 'danger'}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" className="eui-textNoWrap">
                {`${pct}%`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'totalMemoryMib',
      name: AGENT_RAM_LABEL,
      width: '120px',
      align: 'right',
      render: (totalMemoryMib: number | null) =>
        totalMemoryMib == null ? (
          <MetricNotAvailable />
        ) : (
          <EuiText size="s" className="eui-textNoWrap">
            {formatRam(totalMemoryMib)}
          </EuiText>
        ),
    },
    {
      field: 'healthy',
      name: STATUS_LABEL,
      width: '120px',
      render: (healthy: boolean) => (
        <EuiHealth color={healthy ? 'success' : 'danger'}>
          {healthy ? HEALTHY_LABEL : STALE_LABEL}
        </EuiHealth>
      ),
    },
    {
      field: 'lastCheckin',
      name: LAST_CHECKIN_LABEL,
      width: '160px',
      render: (lastCheckin: number | null) => (
        <EuiText size="s" color="subdued">
          {lastCheckin ? moment(lastCheckin).fromNow() : NEVER_LABEL}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiPanel
      color="subdued"
      hasShadow={false}
      paddingSize="m"
      data-test-subj="locationShardDetails"
    >
      <EuiTitle size="xxs">
        <h4>
          <EuiIcon
            type="shard"
            size="m"
            css={{ marginInlineEnd: 6, verticalAlign: 'text-bottom' }}
          />
          {OVERVIEW_TITLE}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup gutterSize="xl" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiStat title={totalMonitors} description={MONITORS_LABEL} titleSize="m" reverse />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiStat
              title={`${shards.length}`}
              description={isScalable ? SHARDS_LABEL : SHARD_SINGULAR_LABEL}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          {isScalable && (
            <EuiFlexItem grow={false}>
              <EuiStat
                title={`${healthyShards}/${shards.length}`}
                description={HEALTHY_SHARDS_LABEL}
                titleSize="m"
                titleColor={healthyShards === shards.length ? 'success' : 'danger'}
                reverse
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiTitle size="xxs">
        <h4>
          {DISTRIBUTION_TITLE}{' '}
          <EuiIconTip content={DISTRIBUTION_HELP} position="right" type="question" />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable<ShardStat>
        items={shards}
        columns={columns}
        tableLayout="auto"
        noItemsMessage={NO_SHARDS_LABEL}
      />
    </EuiPanel>
  );
};

/**
 * "N/A" with an explanatory tooltip, mirroring Fleet's internal
 * `MetricNonAvailable` (not a public export, so replicated here). Shown when a
 * shard's agent isn't shipping host memory metrics — i.e. no System integration.
 */
const MetricNotAvailable = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexEnd" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {NOT_AVAILABLE_LABEL}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip type="info" color="subdued" content={RAM_UNAVAILABLE_HELP} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const formatRam = (mib: number): string =>
  mib >= 1024
    ? i18n.translate('xpack.synthetics.privateLocation.shardDetails.ramGb', {
        defaultMessage: '{value} GB',
        values: { value: (mib / 1024).toFixed(1) },
      })
    : i18n.translate('xpack.synthetics.privateLocation.shardDetails.ramMb', {
        defaultMessage: '{value} MB',
        values: { value: mib },
      });

const LOADING_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.loading', {
  defaultMessage: 'Loading shard details…',
});

const AGENT_RAM_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.agentRam', {
  defaultMessage: 'Agent RAM',
});

const NOT_AVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.notAvailable',
  {
    defaultMessage: 'N/A',
  }
);

const RAM_UNAVAILABLE_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.ramUnavailableHelp',
  {
    defaultMessage:
      'Host memory is unavailable for this agent. Enable the System integration on its agent policy to report total RAM, which lets sharding weight this agent by capacity.',
  }
);

const OVERVIEW_TITLE = i18n.translate('xpack.synthetics.privateLocation.shardDetails.overview', {
  defaultMessage: 'Sharding overview',
});

const SHARD_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.shard', {
  defaultMessage: 'Shard (agent policy)',
});

const DISTRIBUTION_COLUMN = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.distributionColumn',
  {
    defaultMessage: 'Distribution',
  }
);

const MONITORS_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.monitors', {
  defaultMessage: 'Monitors',
});

const STATUS_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.status', {
  defaultMessage: 'Status',
});

const HEALTHY_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.healthy', {
  defaultMessage: 'Healthy',
});

const STALE_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.stale', {
  defaultMessage: 'Stale',
});

const LAST_CHECKIN_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.lastCheckin',
  {
    defaultMessage: 'Last agent check-in',
  }
);

const NEVER_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.never', {
  defaultMessage: 'Never',
});

const SHARDS_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.shards', {
  defaultMessage: 'Shards',
});

const SHARD_SINGULAR_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.shardSingular',
  {
    defaultMessage: 'Shard',
  }
);

const HEALTHY_SHARDS_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.healthyShards',
  {
    defaultMessage: 'Healthy shards',
  }
);

const DISTRIBUTION_TITLE = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.distributionTitle',
  {
    defaultMessage: 'Monitor distribution per shard',
  }
);

const DISTRIBUTION_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.shardDetails.distributionHelp',
  {
    defaultMessage:
      'Each monitor is pinned to exactly one shard (agent policy) for at-most-once execution. When shards are rebalanced, monitors are distributed by memory cost — a browser journey weighs far more than a lightweight check — and weighted by each agent’s RAM where known. If a shard goes stale, its monitors move to healthy shards.',
  }
);

const NO_SHARDS_LABEL = i18n.translate('xpack.synthetics.privateLocation.shardDetails.noShards', {
  defaultMessage: 'No shards configured for this location.',
});
