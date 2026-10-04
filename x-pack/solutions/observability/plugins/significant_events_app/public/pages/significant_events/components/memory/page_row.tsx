/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getMemoryArchiveReasonLabel } from './labels';
import type { MemorySummary } from './types';

const asPercent = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 100);

interface MemoryPageRowProps {
  page: MemorySummary;
  onSelectPage: (id: string) => void;
}

export function MemoryPageRow({ page, onSelectPage }: MemoryPageRowProps) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem>
        <EuiLink
          onClick={() => onSelectPage(page.id)}
          data-test-subj={`nightshiftMemoryRow-${page.id}`}
        >
          {page.title}
        </EuiLink>
      </EuiFlexItem>
      {page.archived && page.archive_reason !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{getMemoryArchiveReasonLabel(page.archive_reason)}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.rowUsefulness"
            defaultMessage="usefulness {usefulness}%"
            values={{ usefulness: asPercent(page.usefulness) }}
          />
          {' · '}
          <FormattedMessage
            id="xpack.significantEventsApp.memory.rowConfidence"
            defaultMessage="confidence {confidence}%"
            values={{ confidence: asPercent(page.confidence) }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedRelative value={page.updated_at} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
