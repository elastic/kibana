/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
} from '@elastic/eui';
import type { AttackStagesSummary } from '../../../../../common/entity_analytics/executive_brief/types';
import { AttackStageTile, UnmappedTile } from '../components/attack_stage_tile';

export const AttackStages: React.FC<{ summary: AttackStagesSummary }> = ({ summary }) => {
  const maxActivity = Math.max(
    1,
    ...summary.stages.map(
      ({ observed }) => observed.alerts + observed.attackDiscoveries + observed.mlAnomalies
    )
  );
  return (
    <div data-test-subj="executiveBriefAttackStages">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{'Detection coverage by attack stage'}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            aria-label="About attack stages"
            content="MITRE ATT&CK tactics. Attacks don't always follow this order."
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={4} gutterSize="s" responsive>
        {summary.stages.map((stage) => (
          <EuiFlexItem key={stage.tacticId}>
            <AttackStageTile stage={stage} maxActivity={maxActivity} />
          </EuiFlexItem>
        ))}
        <EuiFlexItem>
          <UnmappedTile alerts={summary.unmapped.alerts} share={summary.unmapped.share} />
        </EuiFlexItem>
      </EuiFlexGrid>
    </div>
  );
};
