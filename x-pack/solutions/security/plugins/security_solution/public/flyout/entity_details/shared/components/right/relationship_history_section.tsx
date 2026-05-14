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
} from '@elastic/eui';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';

// Local shape — the OpenAPI-generated Entity type still has relationships
// as `string[]` keyed by relType. The actual stored shape is now
// `{ ids: string[], history: [{ euid, first_seen, last_seen }, ...] }`.
// Schema regeneration is intentionally deferred (out of scope for POC).
interface HistoryEntry {
  euid: string;
  first_seen: string;
  last_seen: string;
}

interface RelationshipShape {
  ids?: string[];
  history?: HistoryEntry[];
}

interface Props {
  relationships: Record<string, unknown> | undefined;
}

const REL_TYPE_LABELS: Record<string, string> = {
  accesses_frequently: 'Accesses Frequently',
  accesses_infrequently: 'Accesses Infrequently',
  owns: 'Owns',
  owns_inferred: 'Owns (inferred)',
  supervises: 'Supervises',
  communicates_with: 'Communicates With',
  depends_on: 'Depends On',
  administers: 'Administers',
};

const isHistoryEntry = (val: unknown): val is HistoryEntry =>
  typeof val === 'object' &&
  val !== null &&
  typeof (val as HistoryEntry).euid === 'string' &&
  typeof (val as HistoryEntry).first_seen === 'string' &&
  typeof (val as HistoryEntry).last_seen === 'string';

const extractHistory = (rel: unknown): HistoryEntry[] => {
  const history = (rel as RelationshipShape | undefined)?.history;
  if (!Array.isArray(history)) return [];
  return history.filter(isHistoryEntry);
};

export const RelationshipHistorySection = ({ relationships }: Props) => {
  if (!relationships) return null;

  const entries = Object.entries(relationships)
    .map(([relType, rel]) => [relType, extractHistory(rel)] as const)
    .filter(([, history]) => history.length > 0);

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
      {entries.map(([relType, history]) => (
        <div key={relType}>
          <EuiText size="xs" color="subdued">
            <strong>{REL_TYPE_LABELS[relType] ?? relType.replace(/_/g, ' ')}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {[...history]
            .sort((a, b) => b.last_seen.localeCompare(a.last_seen))
            .map((record) => (
              <EuiFlexGroup key={record.euid} alignItems="center" gutterSize="s" wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{record.euid}</EuiBadge>
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
