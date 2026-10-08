/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import type { GlanceStat } from '../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../test_ids';
import { DeltaBadge } from './delta_badge';

const LABELS: Record<GlanceStat['id'], string> = {
  postureScore: 'Posture score',
  materialRiskEntities: 'Material-risk entities',
  activeSignals: 'Active signals',
  stagesWithActivity: 'Stages with activity',
};

export const getGlanceStatLabel = (id: GlanceStat['id']): string => LABELS[id];

export const BriefStatTile: React.FC<{ stat: GlanceStat }> = ({ stat }) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={TEST_IDS.statTile(stat.id)}>
    <EuiStat title={stat.value} description={getGlanceStatLabel(stat.id)} titleSize="m" />
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <DeltaBadge delta={stat.delta} previous={stat.previous} upIsBad={stat.upIsBad} />
      </EuiFlexItem>
      {stat.previous !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'vs previous period'}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </EuiPanel>
);
