/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PillarStats } from '../hooks/use_readiness_tasks_stats';
import { useReadinessTasksStats } from '../hooks/use_readiness_tasks_stats';
import { usePillarsProps } from '../hooks/use_pillar_props';
import type { PillarProps } from '../hooks/use_pillar_props';

// Color constants
const BRONZE_COLOR = '#966B03';
const SILVER_COLOR = '#5A6D8C';
const GOLD_COLOR = '#F5BC00';

const CARDS_HEIGHT = 240;
const PROGRESS_BAR_SIZE = 120;

interface Pillar {
  pillarProps: PillarProps;
  pillarStats: PillarStats;
}

const PillarDetails: React.FC<Pillar> = ({ pillarProps, pillarStats }) => {
  const { completed, total } = pillarStats;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup direction="row" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiProgress
          value={completed}
          max={total}
          size="m"
          color={pillarProps.color}
          css={{
            transform: 'rotate(-90deg)',
            position: 'absolute',
            top: '70px',
            left: '-42px',
            width: PROGRESS_BAR_SIZE,
          }}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={9}>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          css={{ height: '100%', paddingLeft: euiTheme.size.base, minHeight: PROGRESS_BAR_SIZE }}
        >
          <EuiFlexItem grow={1}>
            <EuiFlexGroup direction="row" alignItems="baseline" gutterSize="s">
              <EuiTitle size="l">
                <span>{`${completed}/${total}`}</span>
              </EuiTitle>
              <EuiTitle size="xs">
                <span>
                  {i18n.translate('xpack.securitySolution.siemReadiness.tasksCompletedLabel', {
                    defaultMessage: 'Tasks completed',
                  })}
                </span>
              </EuiTitle>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3 style={{ marginBottom: euiTheme.size.xxs }}>{pillarProps.displayName}</h3>
            </EuiTitle>
            <EuiText size="s">
              <p>{pillarProps.description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PillarLevelProgress: React.FC<Pillar> = ({ pillarProps, pillarStats }) => {
  const { euiTheme } = useEuiTheme();
  const { completed, total } = pillarStats;

  // Calculate level thresholds
  const bronzeThreshold = 1;
  const silverThreshold = Math.ceil(total / 2);
  const goldThreshold = total;

  // Determine current level and tasks to next level
  let tasksToNextLevel = 0;

  if (completed >= goldThreshold) {
    tasksToNextLevel = 0;
  } else if (completed >= silverThreshold) {
    tasksToNextLevel = goldThreshold - completed;
  } else if (completed >= bronzeThreshold) {
    tasksToNextLevel = silverThreshold - completed;
  } else {
    tasksToNextLevel = bronzeThreshold - completed;
  }

  // Calculate progress percentage for the progress bar
  const progressValue = completed;
  const progressMax = total;

  // Determine which levels have been reached
  const bronzeReached = completed >= bronzeThreshold;
  const silverReached = completed >= silverThreshold;
  const goldReached = completed >= goldThreshold;

  const levelUnreachedColor = euiTheme.colors.severity.unknown;

  const levelColors = {
    bronze: bronzeReached ? BRONZE_COLOR : levelUnreachedColor,
    silver: silverReached ? SILVER_COLOR : levelUnreachedColor,
    gold: goldReached ? GOLD_COLOR : levelUnreachedColor,
  };

  const commonStyle = {
    position: 'absolute' as const,
    top: '-5px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  };

  const shields = [
    {
      key: 'bronze',
      left: '0%',
      transform: 'translateX(-50%)',
      color: levelColors.bronze,
      label: i18n.translate('xpack.securitySolution.siemReadiness.bronzeLevelLabel', {
        defaultMessage: 'Bronze',
      }),
    },
    {
      key: 'silver',
      left: 'calc(50% - 8px)',
      transform: 'none',
      color: levelColors.silver,
      label: i18n.translate('xpack.securitySolution.siemReadiness.silverLevelLabel', {
        defaultMessage: 'Silver',
      }),
    },
    {
      key: 'gold',
      left: '100%',
      transform: 'translateX(-50%)',
      color: levelColors.gold,
      label: i18n.translate('xpack.securitySolution.siemReadiness.goldLevelLabel', {
        defaultMessage: 'Gold',
      }),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.securitySolution.siemReadiness.yourCurrentLevelLabel', {
                  defaultMessage: 'Your current level',
                })}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {tasksToNextLevel > 0 ? (
              <EuiBadge
                iconType="bullseye"
                color={euiTheme.colors.backgroundTransparentPlain}
                css={{ color: euiTheme.colors.primary }}
              >
                {i18n.translate('xpack.securitySolution.siemReadiness.tasksToNextLevelBadge', {
                  defaultMessage: '{count} tasks to next level',
                  values: { count: tasksToNextLevel },
                })}
              </EuiBadge>
            ) : (
              <EuiBadge iconType="check" color="hollow">
                {i18n.translate('xpack.securitySolution.siemReadiness.allTasksCompleteBadge', {
                  defaultMessage: 'All tasks complete',
                })}
              </EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem style={{ padding: '0 16px' }}>
        <div style={{ position: 'relative' }}>
          <EuiProgress color={pillarProps.color} value={progressValue} max={progressMax} size="s" />

          {shields.map((shield) => (
            <div
              key={shield.key}
              style={{
                ...commonStyle,
                left: shield.left,
                transform: shield.transform,
              }}
            >
              <ShieldIcon color={shield.color} />
              <EuiText size="xs" style={{ marginTop: euiTheme.size.xxs }}>
                <strong>{shield.label}</strong>
              </EuiText>
            </div>
          ))}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PillarCard: React.FC<Pillar> = ({ pillarProps, pillarStats }) => {
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={6}>
          <PillarDetails pillarProps={pillarProps} pillarStats={pillarStats} />
        </EuiFlexItem>
        <EuiHorizontalRule margin="m" />
        <EuiFlexItem grow={4}>
          <PillarLevelProgress pillarProps={pillarProps} pillarStats={pillarStats} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ReadinessPillarCards: React.FC = () => {
  const { pillarPropsMap } = usePillarsProps();
  const { readinessTasksStats } = useReadinessTasksStats();

  return (
    <EuiFlexGroup direction="row" gutterSize="l" style={{ height: CARDS_HEIGHT }}>
      {Object.values(pillarPropsMap).map((pillar: PillarProps) => {
        const stats = readinessTasksStats.pillarStatsMap[pillar.pillarKey];

        return (
          <EuiFlexItem key={pillar.pillarKey}>
            <PillarCard pillarProps={pillar} pillarStats={stats} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

const ShieldIcon = ({ color = BRONZE_COLOR, width = 16, height = 16 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 15 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ color }} // this works because fill="currentColor"
  >
    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.56108 1.14412L12.9756 2.28524C13.112 2.31384 13.2095 2.43411 13.2095 2.57419V8.13605C13.2095 9.62186 12.6052 11.1488 11.5081 12.4344C10.4454 13.6789 9.00661 14.5649 7.55969 14.864C7.53988 14.8676 7.52008 14.8698 7.50028 14.8698C7.48048 14.8698 7.45995 14.8676 7.44015 14.864C5.99395 14.5648 4.55436 13.6789 3.49249 12.4344C2.39537 11.1488 1.79108 9.6226 1.79108 8.13605V2.57419C1.79108 2.43485 1.88862 2.31458 2.02503 2.28524L7.43951 1.14412C7.47911 1.13606 7.52074 1.13606 7.56108 1.14412ZM12.619 2.814L7.50006 1.73521L2.38108 2.814V8.13611C2.38108 10.8694 4.71904 13.6649 7.50006 14.273C10.2809 13.6651 12.619 10.8694 12.619 8.13611V2.814ZM10.248 4.86226L6.51441 8.59589L4.75213 6.83361C4.637 6.71847 4.44998 6.71847 4.33484 6.83361C4.2197 6.94875 4.2197 7.13576 4.33484 7.25091L6.30613 9.2222C6.36114 9.2772 6.43667 9.30874 6.51515 9.30874C6.59362 9.30874 6.66842 9.27793 6.72416 9.2222L10.666 5.28036C10.7811 5.16523 10.7811 4.97821 10.666 4.86307C10.5501 4.7472 10.3632 4.74712 10.248 4.86226ZM14.316 8.13611V1.43672L7.50006 6.10352e-05L0.684082 1.43672V8.13611C0.684082 11.8052 3.80098 15.395 7.50006 16.0001C11.1991 15.395 14.316 11.8052 14.316 8.13611Z"
        fill="currentColor"
      />
      <path
        d="M10.248 4.86226L6.51441 8.59589L4.75213 6.83361C4.637 6.71847 4.44998 6.71847 4.33484 6.83361C4.2197 6.94875 4.2197 7.13576 4.33484 7.25091L6.30613 9.2222C6.36114 9.2772 6.43667 9.30874 6.51515 9.30874C6.59362 9.30874 6.66842 9.27793 6.72416 9.2222L10.666 5.28036C10.7811 5.16523 10.7811 4.97821 10.666 4.86307C10.5501 4.7472 10.3632 4.74712 10.248 4.86226Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.56108 1.14412L12.9756 2.28524C13.112 2.31384 13.2095 2.43411 13.2095 2.57419V8.13605C13.2095 9.62186 12.6052 11.1488 11.5081 12.4344C10.4454 13.6789 9.00661 14.5649 7.55969 14.864C7.53988 14.8676 7.52008 14.8698 7.50028 14.8698C7.48048 14.8698 7.45995 14.8676 7.44015 14.864C5.99395 14.5648 4.55436 13.6789 3.49249 12.4344C2.39537 11.1488 1.79108 9.6226 1.79108 8.13605V2.57419C1.79108 2.43485 1.88862 2.31458 2.02503 2.28524L7.43951 1.14412C7.47911 1.13606 7.52074 1.13606 7.56108 1.14412ZM7.50006 1.73521L12.619 2.814V8.13611C12.619 10.8694 10.2809 13.6651 7.50006 14.273C4.71904 13.6649 2.38108 10.8694 2.38108 8.13611V2.814L7.50006 1.73521Z"
        fill="white"
      />
    </svg>
  </svg>
);
