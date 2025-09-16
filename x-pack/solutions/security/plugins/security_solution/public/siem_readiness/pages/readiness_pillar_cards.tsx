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
} from '@elastic/eui';
import { useReadinessTasksStats } from '../hooks/use_readiness_tasks_stats';
import { usePillarProps } from '../hooks/use_pillar_props';

interface PillarCardProps {
  pillar: 'visibility' | 'detection' | 'response';
}

const PillarDetails: React.FC<{ pillar: 'visibility' | 'detection' | 'response' }> = ({
  pillar,
}) => {
  const { readinessTasksStats } = useReadinessTasksStats();
  const { pillars } = usePillarProps();

  const pillarData = readinessTasksStats.pillarsData.find((p) => p.pillar === pillar);
  const completed = pillarData?.completed || 0;
  const total = pillarData?.total || 0;
  const pillarName = pillarData?.pillarName || '';

  return (
    <EuiFlexGroup direction="row" gutterSize="none">
      <EuiFlexItem grow={false}>
        <div
          css={{
            transform: 'rotate(-90deg)',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiProgress
            value={completed}
            max={total}
            size="m"
            color={pillars[pillar].color}
            css={{
              position: 'absolute',
              width: '120px',
            }}
          />
        </div>
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
              <h3 style={{ fontWeight: 'bold', marginBottom: '2px' }}>{pillarName}</h3>
            </EuiTitle>
            <EuiText size="s">
              <p>{pillars[pillar].description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PillarProgressBar: React.FC = () => {
  // TODO: Implement progress bar component
  return <div>{'Progress bar component - to be implemented'}</div>;
};

const PillarCard: React.FC<PillarCardProps> = ({ pillar }) => {
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={6}>
          <PillarDetails pillar={pillar} />
        </EuiFlexItem>
        <EuiHorizontalRule margin="m" />
        <EuiFlexItem grow={4}>
          <PillarProgressBar />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ReadinessPillarCards: React.FC = () => {
  return (
    <EuiFlexGroup direction="row" gutterSize="l" style={{ height: 240 }}>
      <EuiFlexItem>
        <PillarCard pillar="visibility" />
      </EuiFlexItem>
      <EuiFlexItem>
        <PillarCard pillar="detection" />
      </EuiFlexItem>
      <EuiFlexItem>
        <PillarCard pillar="response" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
