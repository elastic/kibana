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
import { useReadinessTasksStats } from '../hooks/use_readiness_tasks_stats';
import { usePillarProps } from '../hooks/use_pillar_props';
import type { PillarProps } from '../hooks/use_pillar_props';
import levelShield from './level_shield.svg';

interface PillarCardProps {
  pillarProps: PillarProps;
  pillarData: {
    completed: number;
    total: number;
  };
}

interface PillarDetailsProps {
  pillarProps: PillarProps;
  pillarData: {
    completed: number;
    total: number;
  };
}

interface PillarLevelProgressProps {
  pillarProps: PillarProps;
  pillarData: {
    completed: number;
    total: number;
  };
}

const PillarDetails: React.FC<PillarDetailsProps> = ({ pillarProps, pillarData }) => {
  const { completed, total } = pillarData;

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
            width: '120px',
          }}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={9}>
        <EuiFlexGroup direction="column" gutterSize="s" style={{ height: '100%', paddingLeft: 16 }}>
          <EuiFlexItem grow={1}>
            <EuiFlexGroup direction="row" alignItems="baseline" gutterSize="s">
              <EuiTitle size="l">
                <span style={{ fontWeight: 'bold' }}>{`${completed}/${total}`}</span>
              </EuiTitle>
              <EuiTitle size="xs">
                <span style={{ fontWeight: 'bold' }}>{'Tasks completed'}</span>
              </EuiTitle>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3 style={{ fontWeight: 'bold', marginBottom: '2px' }}>{pillarProps.displayName}</h3>
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

const PillarLevelProgress: React.FC<PillarLevelProgressProps> = ({ pillarProps, pillarData }) => {
  const { euiTheme } = useEuiTheme();
  const { completed, total } = pillarData;

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
    bronze: bronzeReached ? '#CD7F32' : levelUnreachedColor,
    silver: silverReached ? '#C0C0C0' : levelUnreachedColor,
    gold: goldReached ? '#FFD700' : levelUnreachedColor,
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{'Your current level'}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {tasksToNextLevel > 0 ? (
              <EuiBadge iconType="lensApp" color="primary">
                {`${tasksToNextLevel} tasks to next level`}
              </EuiBadge>
            ) : (
              <EuiBadge iconType="check" color="success">
                {'Max level reached'}
              </EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem style={{ padding: '0 16px' }}>
        <div style={{ position: 'relative' }}>
          <EuiProgress color={pillarProps.color} value={progressValue} max={progressMax} size="s" />

          {/* Bronze Shield - Left */}
          <div
            style={{
              position: 'absolute',
              left: '0%',
              top: '-5px',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <ShieldIcon color={levelColors.bronze} />
            <EuiText size="xs" style={{ marginTop: '2px', fontWeight: 'bold' }}>
              {'Bronze'}
            </EuiText>
          </div>

          {/* Silver Shield - Middle */}
          <div
            style={{
              position: 'absolute',
              left: `calc(50% - 8px)`, // 50% minus half the shield width
              top: '-5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <ShieldIcon color={levelColors.silver} />
            <EuiText size="xs" style={{ marginTop: '2px', fontWeight: 'bold' }}>
              {'Silver'}
            </EuiText>
          </div>

          {/* Gold Shield - Right */}
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: '-5px',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <ShieldIcon color={levelColors.gold} />
            <EuiText size="xs" style={{ marginTop: '2px', fontWeight: 'bold' }}>
              {'Gold'}
            </EuiText>
          </div>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PillarCard: React.FC<PillarCardProps> = ({ pillarProps, pillarData }) => {
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={6}>
          <PillarDetails pillarProps={pillarProps} pillarData={pillarData} />
        </EuiFlexItem>
        <EuiHorizontalRule margin="m" />
        <EuiFlexItem grow={4}>
          <PillarLevelProgress pillarProps={pillarProps} pillarData={pillarData} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ReadinessPillarCards: React.FC = () => {
  const { pillars } = usePillarProps();
  const { readinessTasksStats } = useReadinessTasksStats();

  return (
    <EuiFlexGroup direction="row" gutterSize="l" style={{ height: 240 }}>
      {Object.values(pillars).map((pillarProps) => {
        // Find the corresponding data for this pillar using the value property
        const statsData = readinessTasksStats.pillarsData.find(
          (p) => p.pillar === pillarProps.value
        );

        // Only pass raw completion data
        const pillarData = {
          completed: statsData?.completed || 0,
          total: statsData?.total || 0,
        };

        return (
          <EuiFlexItem key={pillarProps.value}>
            <PillarCard pillarProps={pillarProps} pillarData={pillarData} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

const ShieldIcon = ({ color = '#966B03', width = 16, height = 16 }) => (
  <svg width={width} height={height} style={{ color }}>
    {levelShield}
  </svg>
);
