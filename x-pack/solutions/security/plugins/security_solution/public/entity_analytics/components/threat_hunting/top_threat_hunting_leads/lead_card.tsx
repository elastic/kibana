/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
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

  const tagsFooter =
    lead.tags.length > 0 ? (
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
    ) : undefined;

  return (
    <EuiCard
      title={
        <EuiToolTip content={lead.title} anchorClassName="eui-textTruncate" display="block">
          <span>{lead.title}</span>
        </EuiToolTip>
      }
      titleElement="h5"
      titleSize="xs"
      textAlign="left"
      hasBorder={false}
      description={
        <EuiText size="xs" color="subdued" css={{ overflowWrap: 'anywhere' }}>
          {renderedByline}
        </EuiText>
      }
      footer={tagsFooter}
      paddingSize="l"
      onClick={handleClick}
      data-test-subj={`leadCard-${lead.id}`}
      css={{
        minWidth: 0,
        maxWidth: 480,
        '.euiCard__titleButton': { maxWidth: '100%' },
      }}
    />
  );
};
