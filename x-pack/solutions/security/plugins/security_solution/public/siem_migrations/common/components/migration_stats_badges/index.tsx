/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import * as i18n from './translations';

export interface MigrationStatsBadgesProps {
  /** Stats for the currently selected migration */
  migrationStats: MigrationTaskStats;
}

interface StatBadgeProps {
  count: number;
  label: string;
  color: string;
  testId: string;
}

const StatBadge: React.FC<StatBadgeProps> = React.memo(({ count, label, color, testId }) => (
  <EuiFlexGroup
    direction="row"
    gutterSize="xs"
    alignItems="center"
    responsive={false}
    css={css`
      white-space: nowrap;
    `}
    data-test-subj={testId}
  >
    <EuiText size="xs" css={css({ color, fontWeight: 'bold' })}>
      <span>{count}</span>
    </EuiText>
    <EuiText size="xs" css={css({ color })}>
      <span>{label}</span>
    </EuiText>
  </EuiFlexGroup>
));

StatBadge.displayName = 'StatBadge';

const Separator: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      aria-hidden="true"
      css={css`
        display: inline-block;
        block-size: ${euiTheme.size.l};
        inline-size: 1px;
        background-color: ${euiTheme.colors.lightShade};
      `}
    />
  );
};

Separator.displayName = 'Separator';

/**
 * Inline stats badges rendered in the migration toolbar. Shows a compact
 * summary of the selected migration's item counts (total, translated,
 * processing, pending, failed) separated by thin vertical dividers.
 */
export const MigrationStatsBadges: React.FC<MigrationStatsBadgesProps> = React.memo(
  ({ migrationStats }) => {
    const { euiTheme } = useEuiTheme();

    const stats = useMemo(
      () => [
        {
          count: migrationStats.items.total,
          label: i18n.STATS_TOTAL_LABEL,
          color: euiTheme.colors.text,
          testId: 'migrationStatsTotal',
        },
        {
          count: migrationStats.items.completed,
          label: i18n.STATS_TRANSLATED_LABEL,
          color: euiTheme.colors.success,
          testId: 'migrationStatsTranslated',
        },
        {
          count: migrationStats.items.processing,
          label: i18n.STATS_PROCESSING_LABEL,
          color: euiTheme.colors.primary,
          testId: 'migrationStatsProcessing',
        },
        {
          count: migrationStats.items.pending,
          label: i18n.STATS_PENDING_LABEL,
          color: euiTheme.colors.subduedText,
          testId: 'migrationStatsPending',
        },
        {
          count: migrationStats.items.failed,
          label: i18n.STATS_FAILED_LABEL,
          color: euiTheme.colors.danger,
          testId: 'migrationStatsFailed',
        },
      ],
      [migrationStats.items, euiTheme.colors]
    );

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="m"
        alignItems="center"
        responsive={false}
        data-test-subj="migrationStatsBadges"
      >
        {stats.map((stat, index) => (
          <React.Fragment key={stat.testId}>
            {index > 0 && (
              <EuiFlexItem grow={false}>
                <Separator />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <StatBadge {...stat} />
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    );
  }
);

MigrationStatsBadges.displayName = 'MigrationStatsBadges';
