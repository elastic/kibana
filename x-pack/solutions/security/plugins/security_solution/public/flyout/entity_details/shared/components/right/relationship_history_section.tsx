/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { useRelationshipHistory } from '../../hooks/use_relationship_history';

interface Props {
  entityId: string | undefined;
}

const REL_TYPE_LABELS: Record<string, string> = {
  Accesses_frequently: 'Accesses Frequently',
  Owns: 'Owns',
  Supervises: 'Supervises',
  Supervised_by: 'Supervised By',
  Communicates_with: 'Communicates With',
  Depends_on: 'Depends On',
  Dependent_of: 'Dependent Of',
  Owned_by: 'Owned By',
  Accessed_frequently_by: 'Accessed Frequently By',
};

export const RelationshipHistorySection = ({ entityId }: Props) => {
  const { data, isLoading, isError } = useRelationshipHistory(entityId);

  if (!entityId) return null;

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (isError) {
    return (
      <EuiText size="xs" color="danger">
        {'Failed to load relationship history'}
      </EuiText>
    );
  }

  const entries = Object.entries(data ?? {}).filter(([, records]) => records.length > 0);
  if (entries.length === 0) return null;

  return (
    <EuiAccordion
      id="relationship-history-section"
      buttonContent={
        <EuiTitle size="xs">
          <h3>{'Relationships'}</h3>
        </EuiTitle>
      }
      initialIsOpen
    >
      <EuiSpacer size="s" />
      {entries.map(([relType, records]) => (
        <div key={relType}>
          <EuiText size="xs" color="subdued">
            <strong>{REL_TYPE_LABELS[relType] ?? relType.replace(/_/g, ' ')}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {[...records]
            .sort((a, b) => b.last_seen.localeCompare(a.last_seen))
            .map((record) => (
              <EuiFlexGroup key={record.target_euid} alignItems="center" gutterSize="s" wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{record.target_euid}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {'First: '}
                    <PreferenceFormattedDate value={new Date(record.first_seen)} />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {'Last: '}
                    <PreferenceFormattedDate value={new Date(record.last_seen)} />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
          <EuiSpacer size="s" />
        </div>
      ))}
    </EuiAccordion>
  );
};
