/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HuntingLead } from './types';
import { PriorityBadge } from './priority_badge';
import { getStalenessLabel, VIEW_LEAD_DETAILS } from './translations';

const MAX_VISIBLE_TAGS = 3;

const cardStyles = css`
  cursor: pointer;
  min-width: 260px;
  max-width: 360px;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  transition: transform 0.15s ease, box-shadow 0.15s ease;
`;

const titleStyles = css`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

const getStalenessColor = (staleness: string): string => {
  switch (staleness) {
    case 'fresh':
      return 'success';
    case 'stale':
      return 'warning';
    case 'expired':
      return 'danger';
    default:
      return 'default';
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
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <PriorityBadge priority={lead.priority} />
            </EuiFlexItem>
            <EuiFlexItem css={titleStyles}>
              <EuiText size="s" css={titleStyles}>
                {lead.title}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={getStalenessColor(lead.staleness)}>
                    {getStalenessLabel(lead.staleness)}
                  </EuiBadge>
                </EuiFlexItem>
                {onInfoClick && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={VIEW_LEAD_DETAILS} disableScreenReaderOutput>
                      <EuiButtonIcon
                        aria-label={VIEW_LEAD_DETAILS}
                        iconType="iInCircle"
                        size="xs"
                        onClick={handleInfoClick}
                        data-test-subj={`leadInfoButton-${lead.id}`}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
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
