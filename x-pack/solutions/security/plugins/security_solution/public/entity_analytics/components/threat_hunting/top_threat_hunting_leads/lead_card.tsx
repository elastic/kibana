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
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HuntingLead } from './types';
import { VIEW_LEAD_DETAILS } from './translations';
import { getEntityIcon } from './utils';

const MAX_VISIBLE_TAGS = 3;

const getCardStyles = (euiTheme: EuiThemeComputed) => css`
  position: relative;
  cursor: pointer;
  min-width: 260px;
  max-width: 360px;
  transition: transform ${euiTheme.animation.normal} ease,
    box-shadow ${euiTheme.animation.normal} ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${euiTheme.colors.shadow};
  }
`;

const infoIconStyles = css`
  position: absolute;
  top: 8px;
  right: 8px;
`;

interface LeadCardProps {
  lead: HuntingLead;
  onClick: (lead: HuntingLead) => void;
  onInfoClick?: (lead: HuntingLead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, onInfoClick }) => {
  const { euiTheme } = useEuiTheme();
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
      css={getCardStyles(euiTheme)}
      onClick={handleClick}
      data-test-subj={`leadCard-${lead.id}`}
    >
      {onInfoClick && (
        <EuiButtonIcon
          iconType="iInCircle"
          aria-label={VIEW_LEAD_DETAILS}
          onClick={handleInfoClick}
          data-test-subj={`leadInfoButton-${lead.id}`}
          css={infoIconStyles}
        />
      )}

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              font-weight: 600;
              padding-right: 24px;
            `}
          >
            <EuiTextTruncate text={lead.title} />
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <EuiTextTruncate text={lead.byline} />
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
