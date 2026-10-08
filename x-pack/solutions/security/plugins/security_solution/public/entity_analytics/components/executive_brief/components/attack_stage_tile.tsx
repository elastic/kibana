/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { AttackStage } from '../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../test_ids';

interface AttackStageTileProps {
  stage: AttackStage;
  /** Highest alert count across stages, used to scale the activity fill. */
  maxActivity: number;
}

const activityOf = (stage: AttackStage): number =>
  stage.observed.alerts + stage.observed.attackDiscoveries + stage.observed.mlAnomalies;

export const AttackStageTile: React.FC<AttackStageTileProps> = ({ stage, maxActivity }) => {
  const activity = activityOf(stage);
  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      data-test-subj={TEST_IDS.stageTile(stage.tacticId)}
      aria-label={stage.tacticName}
    >
      <EuiText size="xs">
        <strong>{stage.tacticName}</strong>
      </EuiText>
      {stage.topTechnique && (
        <EuiText size="xs" color="subdued">
          {`${stage.topTechnique.id} ${stage.topTechnique.name}`}
        </EuiText>
      )}
      <EuiProgress
        size="xs"
        color="subdued"
        value={activity}
        max={Math.max(maxActivity, 1)}
        aria-label={`${stage.tacticName} activity`}
      />
      <EuiText size="xs">
        {`${stage.observed.alerts} alerts`}
        {stage.observed.attackDiscoveries > 0 && ` · ${stage.observed.attackDiscoveries} AD`}
        {stage.observed.mlAnomalies > 0 && ` · ML: ${stage.observed.mlAnomalies} possible`}
      </EuiText>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj="executiveBriefRulesWorking">
            {`${stage.coverage.effective}/${stage.coverage.enabled} rules working`}
          </EuiText>
        </EuiFlexItem>
        {stage.flag === 'limited_coverage' && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">{'Limited coverage'}</EuiBadge>
          </EuiFlexItem>
        )}
        {stage.flag === 'no_working_detection' && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">{'No working detection'}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const UnmappedTile: React.FC<{ alerts: number; share: number }> = ({ alerts, share }) => (
  <EuiPanel hasBorder paddingSize="s" data-test-subj={TEST_IDS.stageTile('unmapped')}>
    <EuiToolTip content="Alerts from rules with no MITRE ATT&CK mapping are invisible to stage coverage.">
      <EuiText size="xs" tabIndex={0}>
        <strong>{'Unmapped'}</strong>
      </EuiText>
    </EuiToolTip>
    <EuiProgress
      size="xs"
      color="subdued"
      value={Math.round(share * 100)}
      max={100}
      aria-label="Unmapped share of alerts"
    />
    <EuiText size="xs">{`${alerts} alerts · ${Math.round(share * 100)}% of all alerts`}</EuiText>
  </EuiPanel>
);
