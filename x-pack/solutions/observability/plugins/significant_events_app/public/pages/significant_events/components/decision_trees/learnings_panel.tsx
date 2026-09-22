/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LearningKind, LearningRecord } from '@kbn/nightshift-decision-trees';
import { getLearningKindLabel } from './labels';

interface LearningsPanelProps {
  learnings: LearningRecord[];
}

type LearningFilter = 'all' | LearningKind;

const KIND_COLORS: Record<LearningKind, string> = {
  system: 'primary',
  tool: 'accent',
  remediation: 'success',
};

const LearningRow = ({ learning }: { learning: LearningRecord }) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="s">
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color={KIND_COLORS[learning.kind] ?? 'hollow'}>
          {getLearningKindLabel(learning.kind)}
        </EuiBadge>
      </EuiFlexItem>
      {learning.category !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{learning.category}</EuiBadge>
        </EuiFlexItem>
      )}
      {learning.connector_name !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{learning.connector_name}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiText size="s">{learning.content}</EuiText>
  </EuiPanel>
);

export function LearningsPanel({ learnings }: LearningsPanelProps) {
  const [filter, setFilter] = useState<LearningFilter>('all');

  const counts = useMemo(() => {
    const byKind: Record<LearningKind, number> = { system: 0, tool: 0, remediation: 0 };
    for (const learning of learnings) {
      byKind[learning.kind] += 1;
    }
    return byKind;
  }, [learnings]);

  const visible =
    filter === 'all' ? learnings : learnings.filter((learning) => learning.kind === filter);

  if (learnings.length === 0) {
    return (
      <EuiText color="subdued" size="s" data-test-subj="nightshiftDecisionTreeLearningsEmpty">
        {i18n.translate('xpack.significantEventsApp.decisionTrees.learnings.empty', {
          defaultMessage: 'No learnings recorded for this tree yet.',
        })}
      </EuiText>
    );
  }

  const tabs: Array<{ id: LearningFilter; label: string; count: number }> = [
    {
      id: 'all',
      label: i18n.translate('xpack.significantEventsApp.decisionTrees.learnings.all', {
        defaultMessage: 'All',
      }),
      count: learnings.length,
    },
    {
      id: 'system',
      label: getLearningKindLabel('system'),
      count: counts.system,
    },
    {
      id: 'tool',
      label: getLearningKindLabel('tool'),
      count: counts.tool,
    },
    {
      id: 'remediation',
      label: getLearningKindLabel('remediation'),
      count: counts.remediation,
    },
  ];

  return (
    <div data-test-subj="nightshiftDecisionTreeLearnings">
      <EuiTabs size="s">
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            append={<EuiBadge color="hollow">{tab.count}</EuiBadge>}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {visible.map((learning, index) => (
          <EuiFlexItem key={`${learning.kind}-${index}`} grow={false}>
            <LearningRow learning={learning} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}
