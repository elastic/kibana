/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HuntingLead } from './types';
import { VIEW_LEAD_DETAILS } from './translations';

const MAX_VISIBLE_TAGS = 3;

const cardStyles = css`
  position: relative;
  cursor: pointer;
  min-width: 260px;
  max-width: 360px;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  transition: transform 0.15s ease, box-shadow 0.15s ease;
`;

const infoIconStyles = css`
  position: absolute;
  top: 8px;
  right: 8px;
  cursor: pointer;
  &:hover {
    opacity: 0.7;
  }
`;

const titleStyles = css`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 24px;
`;

const bylineStyles = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'user';
    case 'host':
      return 'desktop';
    case 'service':
      return 'gear';
    default:
      return 'questionInCircle';
  }
};

interface LeadCardProps {
  lead: HuntingLead;
  onClick: (lead: HuntingLead) => void;
  onInfoClick?: (lead: HuntingLead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, onInfoClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const handleInfoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onInfoClick?.(lead);
    },
    [onInfoClick, lead]
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={cardStyles}
      onClick={handleClick}
      data-test-subj={`leadCard-${lead.id}`}
    >
      {onInfoClick && (
        <span
          role="button"
          tabIndex={0}
          css={infoIconStyles}
          aria-label={VIEW_LEAD_DETAILS}
          onClick={handleInfoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onInfoClick?.(lead);
            }
          }}
          data-test-subj={`leadInfoButton-${lead.id}`}
        >
          <EuiIcon type="info" size="m" aria-hidden={true} />
        </span>
      )}

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s" css={titleStyles}>
            {lead.title}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" css={bylineStyles}>
            {lead.byline}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {lead.entities.map((entity) => (
              <EuiFlexItem grow={false} key={`${entity.type}-${entity.name}`}>
                <EuiBadge color="hollow">
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="xs"
                    responsive={false}
                    component="span"
                  >
                    <EuiIcon type={getEntityIcon(entity.type)} size="s" aria-hidden={true} />
                    <span>{entity.name}</span>
                  </EuiFlexGroup>
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        {lead.tags.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {lead.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="default">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
              {lead.tags.length > MAX_VISIBLE_TAGS && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="default">{`+${lead.tags.length - MAX_VISIBLE_TAGS}`}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
