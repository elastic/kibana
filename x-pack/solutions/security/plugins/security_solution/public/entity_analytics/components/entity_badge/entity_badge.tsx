/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlyoutOrigin } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import {
  getOpenEntityFlyoutLabel,
  VIEW_ENTITY_DETAILS,
} from '../threat_hunting/top_threat_hunting_leads/translations';
import { getEntityIcon } from '../threat_hunting/top_threat_hunting_leads/utils';
import { useOpenEntityFlyout } from './use_open_entity_flyout';

const ENTITY_BADGE_NAME_CLASS = 'leadEntityBadge__name';

// Lets the badge shrink below its content width (rather than overflowing the
// card) when the surrounding card/panel is narrower than the badge's natural
// size, e.g. on small screens.
const entityBadgeContainerCss = css`
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  vertical-align: bottom;
`;

interface EntityBadgeProps {
  entity: { type: string; name: string; id: string };
  scopeId: string;
  /** Telemetry origin of the flyout open. Defaults to the threat hunting leads origin. */
  origin?: FlyoutOrigin;
}

/**
 * Renders an entity's name/type as a badge. When the entity type maps to a
 * known entity flyout panel, clicking the badge opens that entity's flyout
 * instead of triggering the surrounding card's click handler (e.g. opening
 * the Agent Builder chat).
 */
export const EntityBadge: React.FC<EntityBadgeProps> = ({
  entity,
  scopeId,
  origin = FLYOUT_ORIGIN.THREAT_HUNTING_LEADS,
}) => {
  const { canOpen, open } = useOpenEntityFlyout(scopeId, origin);
  const { euiTheme } = useEuiTheme();

  const badgeContent = (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      component="span"
      css={css`
        min-width: 0;
        max-width: 100%;
      `}
    >
      <EuiIcon type={getEntityIcon(entity.type)} size="s" aria-hidden={true} />
      <span
        className={ENTITY_BADGE_NAME_CLASS}
        css={css`
          color: ${euiTheme.colors.textPrimary};
          font-weight: ${euiTheme.font.weight.medium};
          display: inline-block;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: bottom;
        `}
      >
        {entity.name}
      </span>
    </EuiFlexGroup>
  );

  if (!canOpen(entity)) {
    return (
      <EuiBadge color="hollow" css={entityBadgeContainerCss}>
        {badgeContent}
      </EuiBadge>
    );
  }

  const handleOpenEntityFlyout = () => open(entity);

  // Rendered as a `span[role=button]` (rather than passing `onClick` to
  // `EuiBadge`, which would render a nested `<button>`) since these badges
  // sit inside other clickable elements (cards/panels) that are themselves
  // rendered as `<button>`, and nested buttons are invalid HTML.
  return (
    <EuiToolTip
      content={VIEW_ENTITY_DETAILS}
      position="top"
      // EuiToolTip's anchor wrapper defaults to `display: inline-block`, which
      // sizes itself to its own preferred content width rather than
      // respecting the badge's `max-width: 100%` below it, letting long names
      // overflow their container. `inline` lets it flow within the
      // surrounding line box instead, so the max-width constraint applies.
      anchorProps={{ style: { display: 'inline' } }}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label={getOpenEntityFlyoutLabel(entity.name)}
        data-test-subj={`leadEntityBadge-${entity.name}`}
        css={css`
          display: inline-block;
          min-width: 0;
          max-width: 100%;
          vertical-align: bottom;

          &:hover .${ENTITY_BADGE_NAME_CLASS} {
            text-decoration: underline;
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenEntityFlyout();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleOpenEntityFlyout();
          }
        }}
      >
        <EuiBadge color="hollow" css={entityBadgeContainerCss}>
          {badgeContent}
        </EuiBadge>
      </span>
    </EuiToolTip>
  );
};
