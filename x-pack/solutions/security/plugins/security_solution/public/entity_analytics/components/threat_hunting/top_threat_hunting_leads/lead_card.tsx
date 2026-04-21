/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import type { HuntingLead } from './types';
import { MAX_VISIBLE_TAGS } from './utils';
import { renderTextWithEntities, TagsPopover } from './shared_lead_components';

interface LeadCardProps {
  lead: HuntingLead;
  onClick: (lead: HuntingLead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const renderedByline = useMemo(
    () => renderTextWithEntities(lead.byline, lead.entities),
    [lead.byline, lead.entities]
  );
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      onClick={handleClick}
      data-test-subj={`leadCard-${lead.id}`}
      css={{ minWidth: 0 }}
    >
      <EuiFlexGroup direction="column" gutterSize="s" css={{ minWidth: 0 }}>
        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <EuiTitle size="xs">
            <h5 css={{ overflowWrap: 'anywhere' }}>{lead.title}</h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <EuiText size="xs" color="subdued" css={{ overflowWrap: 'anywhere' }}>
            {renderedByline}
          </EuiText>
        </EuiFlexItem>

        {lead.tags.length > 0 && (
          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
              {lead.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
              {lead.tags.length > MAX_VISIBLE_TAGS && (
                <EuiFlexItem grow={false}>
                  <TagsPopover tags={lead.tags} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
