/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiBadge,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { ConversationTemplateTabRenderProps } from '@kbn/agent-builder-browser';

const STATUS_COLORS: Record<string, string> = {
  open: 'warning',
  in_progress: 'primary',
  resolved: 'success',
  false_positive: 'default',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
};

export const InvestigationOverviewTab: React.FC<ConversationTemplateTabRenderProps> = ({
  conversation,
}) => {
  const metadata = conversation.metadata ?? {};

  if (!Object.keys(metadata).length) {
    return (
      <EuiText color="subdued" size="s">
        <p>The investigation agent has not written structured metadata yet.</p>
      </EuiText>
    );
  }

  return (
    <EuiDescriptionList compressed>
      {metadata.status && (
        <>
          <EuiDescriptionListTitle>Status</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiBadge color={STATUS_COLORS[String(metadata.status)] ?? 'default'}>
              {String(metadata.status).replace('_', ' ')}
            </EuiBadge>
          </EuiDescriptionListDescription>
        </>
      )}
      {metadata.severity && (
        <>
          <EuiDescriptionListTitle>Severity</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiBadge color={SEVERITY_COLORS[String(metadata.severity)] ?? 'default'}>
              {String(metadata.severity)}
            </EuiBadge>
          </EuiDescriptionListDescription>
        </>
      )}
      {metadata.summary && (
        <>
          <EuiDescriptionListTitle>Summary</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{String(metadata.summary)}</EuiDescriptionListDescription>
        </>
      )}
      {metadata.root_cause && (
        <>
          <EuiDescriptionListTitle>Root cause</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {String(metadata.root_cause)}
          </EuiDescriptionListDescription>
        </>
      )}
      {Array.isArray(metadata.affected_services) && metadata.affected_services.length > 0 && (
        <>
          <EuiDescriptionListTitle>Affected services</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiFlexGroup wrap gutterSize="xs">
              {(metadata.affected_services as string[]).map((svc) => (
                <EuiFlexItem grow={false} key={svc}>
                  <EuiBadge>{svc}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiDescriptionListDescription>
        </>
      )}
    </EuiDescriptionList>
  );
};
