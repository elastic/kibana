/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GreetingTitle } from '../../components/ui/greeting_title';
import {
  getHeroMarkSeverity,
  HeroMark,
  type HeroMarkSeverity,
} from '../../components/ui/hero_mark';

export interface NightshiftHeaderProps {
  isLoading?: boolean;
  /** In-progress investigations currently being worked. */
  activeInvestigationCount?: number;
  /** Finished investigations with a severity (critical / high / medium / low). */
  needsYouCount?: number;
  /** Finished severity counts; drives the hero-mark status dot. */
  severityCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Replaces the status-derived hero title. */
  title?: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return i18n.translate('xpack.nightshift.hero.morningGreetingDescription', {
      defaultMessage: 'Good morning!',
    });
  }

  if (hour < 18) {
    return i18n.translate('xpack.nightshift.hero.afternoonGreetingDescription', {
      defaultMessage: 'Good afternoon!',
    });
  }

  return i18n.translate('xpack.nightshift.hero.eveningGreetingDescription', {
    defaultMessage: 'Good evening!',
  });
};

const getHeroTitle = ({
  isLoading,
  activeInvestigationCount,
  needsYouCount,
}: {
  isLoading: boolean;
  activeInvestigationCount: number;
  needsYouCount: number;
}): string => {
  if (isLoading) {
    return i18n.translate('xpack.nightshift.hero.checkingTitle', {
      defaultMessage: 'Looking into your data...',
    });
  }

  if (activeInvestigationCount > 0) {
    return i18n.translate('xpack.nightshift.hero.investigatingProblemsTitle', {
      defaultMessage:
        'Investigating {activeInvestigationCount, plural, one {# new problem} other {# new problems}}',
      values: { activeInvestigationCount },
    });
  }

  return i18n.translate('xpack.nightshift.hero.needsYouTitle', {
    defaultMessage:
      '{needsYouCount, plural, one {# investigation needs you} other {# investigations need you}}',
    values: { needsYouCount },
  });
};

export function NightshiftHeader({
  isLoading = false,
  activeInvestigationCount = 0,
  needsYouCount = 0,
  severityCounts,
  title: titleOverride,
}: NightshiftHeaderProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const title =
    titleOverride ?? getHeroTitle({ isLoading, activeInvestigationCount, needsYouCount });
  const markSeverity: HeroMarkSeverity | undefined = severityCounts
    ? getHeroMarkSeverity(severityCounts)
    : undefined;

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        padding: 0;
      `}
    >
      <EuiFlexGroup
        alignItems="flexEnd"
        direction="row"
        gutterSize="l"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow>
          <EuiFlexGroup
            alignItems="center"
            direction="row"
            gutterSize="none"
            responsive={false}
            css={css`
              /* 4px tighter than gutter m (16px → 12px). */
              gap: calc(${euiTheme.size.m} - ${euiTheme.size.xs});
            `}
          >
            <EuiFlexItem grow={false}>
              <HeroMark severity={markSeverity} />
            </EuiFlexItem>
            <EuiFlexItem>
              <GreetingTitle greeting={getGreeting()} title={title} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
