/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleMigrationTranslationStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useResultVisColors } from '../../utils';
import * as i18n from './translations';

export interface MigrationStatsBadgesProps {
  /** Translation stats for the currently selected migration */
  translationStats: RuleMigrationTranslationStats;
}

interface StatItemProps {
  count: number;
  label: string;
  /** Color used for both the label text and the count badge */
  labelColor: string;
  /** Named EUI badge color (or hex) for the count badge background */
  badgeColor: string;
  testId: string;
}

const StatItem: React.FC<StatItemProps> = React.memo(
  ({ count, label, labelColor, badgeColor, testId }) => (
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
      <EuiText size="xs" css={css({ color: labelColor })}>
        <span>{label}</span>
      </EuiText>
      <EuiBadge color={badgeColor} data-test-subj={`${testId}Badge`}>
        {count}
      </EuiBadge>
    </EuiFlexGroup>
  )
);

StatItem.displayName = 'StatItem';

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
 * Inline translation stats badges rendered in the migration toolbar. Shows a
 * compact summary of the selected migration's translation results (total,
 * translated, partially translated, not translated, failed) separated by
 * thin vertical dividers. Each stat renders as `<label> <count_badge>` where
 * the badge shares the translation result's semantic color, matching the
 * translation results chart/table.
 */
export const MigrationStatsBadges: React.FC<MigrationStatsBadgesProps> = React.memo(
  ({ translationStats }) => {
    const { euiTheme } = useEuiTheme();
    const translationResultColors = useResultVisColors();

    const stats = useMemo(
      () => [
        {
          count: translationStats.rules.total,
          label: i18n.STATS_TOTAL_LABEL,
          labelColor: euiTheme.colors.text,
          badgeColor: 'hollow',
          testId: 'migrationStatsTotal',
        },
        {
          count: translationStats.rules.success.result.full,
          label: i18n.STATS_TRANSLATED_LABEL,
          labelColor: translationResultColors.full,
          badgeColor: translationResultColors.full,
          testId: 'migrationStatsTranslated',
        },
        {
          count: translationStats.rules.success.result.partial,
          label: i18n.STATS_PARTIAL_LABEL,
          labelColor: translationResultColors.partial,
          badgeColor: translationResultColors.partial,
          testId: 'migrationStatsPartial',
        },
        {
          count: translationStats.rules.success.result.untranslatable,
          label: i18n.STATS_UNTRANSLATABLE_LABEL,
          labelColor: translationResultColors.untranslatable,
          badgeColor: translationResultColors.untranslatable,
          testId: 'migrationStatsUntranslatable',
        },
        {
          count: translationStats.rules.failed,
          label: i18n.STATS_FAILED_LABEL,
          labelColor: translationResultColors.error,
          badgeColor: translationResultColors.error,
          testId: 'migrationStatsFailed',
        },
      ],
      [translationStats, euiTheme.colors, translationResultColors]
    );

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
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
              <StatItem {...stat} />
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    );
  }
);

MigrationStatsBadges.displayName = 'MigrationStatsBadges';
