/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
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
  /** Semantic fill color for the count badge. Omit for a neutral outlined badge. */
  accentColor?: string;
  testId: string;
}

const StatItem: React.FC<StatItemProps> = React.memo(({ count, label, accentColor, testId }) => {
  const { euiTheme } = useEuiTheme();
  const isFilled = Boolean(accentColor);

  return (
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
      <EuiText size="xs">
        <span
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            color: ${euiTheme.colors.textParagraph};
          `}
        >
          {label}
        </span>
      </EuiText>
      <span
        data-test-subj={`${testId}Badge`}
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-inline-size: ${euiTheme.size.l};
          block-size: ${euiTheme.size.l};
          padding-inline: ${euiTheme.size.xs};
          border: ${euiTheme.border.width.thin} solid
            ${isFilled ? accentColor : euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${isFilled ? accentColor : euiTheme.colors.backgroundBasePlain};
          line-height: 1;
        `}
      >
        <EuiText
          size="xs"
          css={css`
            margin: 0;
          `}
        >
          <span
            css={css`
              color: ${isFilled ? euiTheme.colors.textInverse : euiTheme.colors.textParagraph};
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {count}
          </span>
        </EuiText>
      </span>
    </EuiFlexGroup>
  );
});

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
        background-color: ${euiTheme.colors.borderBaseSubdued};
      `}
    />
  );
};

Separator.displayName = 'Separator';

/**
 * Inline translation stats badges rendered in the migration toolbar. Shows a
 * compact summary of the selected migration's translation results (total,
 * translated, partially translated, not translated, failed) separated by
 * thin vertical dividers. Each stat renders as a bold label plus a square
 * count badge; status stats use a filled semantic color, total stays outlined.
 */
export const MigrationStatsBadges: React.FC<MigrationStatsBadgesProps> = React.memo(
  ({ translationStats }) => {
    const translationResultColors = useResultVisColors();

    const stats = useMemo(
      () => [
        {
          count: translationStats.rules.total,
          label: i18n.STATS_TOTAL_LABEL,
          testId: 'migrationStatsTotal',
        },
        {
          count: translationStats.rules.success.result.full,
          label: i18n.STATS_TRANSLATED_LABEL,
          testId: 'migrationStatsTranslated',
        },
        {
          count: translationStats.rules.success.result.partial,
          label: i18n.STATS_PARTIAL_LABEL,
          testId: 'migrationStatsPartial',
        },
        {
          count: translationStats.rules.success.result.untranslatable,
          label: i18n.STATS_UNTRANSLATABLE_LABEL,
          testId: 'migrationStatsUntranslatable',
        },
        {
          count: translationStats.rules.failed,
          label: i18n.STATS_FAILED_LABEL,
          accentColor: translationResultColors.error,
          testId: 'migrationStatsFailed',
        },
      ],
      [translationStats, translationResultColors]
    );

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="m"
        alignItems="center"
        justifyContent="flexStart"
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
