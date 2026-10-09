/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../test_ids';

interface SourcePill {
  key: string;
  count: number;
  singular: string;
  plural: string;
  /** Text for a zero count, so an absent source reads as absent. */
  none: string;
  color: string;
  icon: string;
}

const countByKind = (snapshot: BriefSnapshot, kind: string): number =>
  Object.values(snapshot.catalog).filter((entry) => entry.kind === kind).length;

export const getSourcePills = (snapshot: BriefSnapshot): SourcePill[] => {
  const entityTypes = new Set(Object.values(snapshot.entities).map(({ type }) => type));
  return [
    {
      key: 'entities',
      count: Object.keys(snapshot.entities).length,
      singular: 'entity',
      plural: 'entities',
      none: 'No entities',
      color: 'primary',
      icon: 'user',
    },
    {
      key: 'entityTypes',
      count: entityTypes.size,
      singular: 'entity type',
      plural: 'entity types',
      none: 'No entity types',
      color: 'primary',
      icon: 'storage',
    },
    {
      key: 'rules',
      count: countByKind(snapshot, 'rule'),
      singular: 'rule',
      plural: 'rules',
      none: 'No rules',
      color: 'warning',
      icon: 'securitySignalDetected',
    },
    {
      key: 'attackDiscoveries',
      count: countByKind(snapshot, 'attack_discovery'),
      singular: 'attack discovery',
      plural: 'attack discoveries',
      none: 'No attack discoveries',
      color: 'accent',
      icon: 'sparkles',
    },
    {
      key: 'leads',
      count: countByKind(snapshot, 'lead'),
      singular: 'hunting lead',
      plural: 'hunting leads',
      none: 'No hunting leads',
      color: 'success',
      icon: 'search',
    },
    {
      key: 'anomalies',
      count: countByKind(snapshot, 'anomaly'),
      singular: 'anomaly group',
      plural: 'anomaly groups',
      none: 'No anomaly groups',
      color: 'default',
      icon: 'machineLearningApp',
    },
  ];
};

/** "Based on" row: one pill per evidence source, coloured and iconned by source; zero counts are muted. */
export const BasedOn: React.FC<{ snapshot: BriefSnapshot }> = ({ snapshot }) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="center"
    wrap
    responsive={false}
    data-test-subj={TEST_IDS.basedOn}
  >
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {'Based on'}
      </EuiText>
    </EuiFlexItem>
    {getSourcePills(snapshot).map(({ key, count, singular, plural, none, color, icon }) => (
      <EuiFlexItem grow={false} key={key}>
        {count === 0 ? (
          <EuiBadge color="hollow" data-test-subj={`executiveBriefBasedOn-${key}-empty`}>
            <EuiText size="xs" color="subdued" component="span">
              {none}
            </EuiText>
          </EuiBadge>
        ) : (
          <EuiBadge color={color} iconType={icon} data-test-subj={`executiveBriefBasedOn-${key}`}>
            {`${count} ${count === 1 ? singular : plural}`}
          </EuiBadge>
        )}
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
