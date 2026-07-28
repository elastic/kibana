/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityType } from '../../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import { getOpenEntityFlyoutLabel, VIEW_ENTITY_DETAILS } from './translations';
import { getEntityIcon } from './utils';

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

const isKnownEntityType = (type: string): type is EntityType =>
  (Object.values(EntityType) as string[]).includes(type);

interface EntityBadgeProps {
  entity: { type: string; name: string; id?: string };
  scopeId: string;
}

/**
 * Renders an entity's name/type as a badge. When the entity type maps to a
 * known entity flyout panel, clicking the badge opens that entity's flyout
 * instead of triggering the surrounding card's click handler (e.g. opening
 * the Agent Builder chat).
 */
export const EntityBadge: React.FC<EntityBadgeProps> = ({ entity, scopeId }) => {
  const { openFlyout } = useExpandableFlyoutApi();
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

  if (!isKnownEntityType(entity.type)) {
    return (
      <EuiBadge color="hollow" css={entityBadgeContainerCss}>
        {badgeContent}
      </EuiBadge>
    );
  }

  const panelKey = EntityPanelKeyByType[entity.type];
  const panelParam = EntityPanelParamByType[entity.type];

  if (!panelKey || !panelParam) {
    return (
      <EuiBadge color="hollow" css={entityBadgeContainerCss}>
        {badgeContent}
      </EuiBadge>
    );
  }

  // Prefer the real Entity Store EUID (e.g. `host:8c67cb16-...`) so the
  // flyout resolves the entity directly by id. Older leads persisted before
  // this field existed fall back to `type:name`, which is only correct when
  // the display name happens to be the entity's raw id (e.g. hosts without a
  // friendly name) — best-effort, but strictly better than a name-only match.
  const entityId = entity.id ?? `${entity.type}:${entity.name}`;

  const openEntityFlyout = () => {
    openFlyout({
      right: {
        id: panelKey,
        params: {
          [panelParam]: entity.name,
          entityId,
          contextID: scopeId,
          scopeId,
        },
      },
    });
  };

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
          openEntityFlyout();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openEntityFlyout();
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

export const renderTextWithEntities = (
  text: string,
  entities: Array<{ type: string; name: string; id?: string }>,
  scopeId: string
): React.ReactNode => {
  if (!entities.length) return text;

  interface Match {
    start: number;
    end: number;
    entity: { type: string; name: string; id?: string };
  }
  const matches: Match[] = [];

  for (const entity of entities) {
    const typeLabel = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
    const withPrefix = `${typeLabel} ${entity.name}`;
    let idx = text.indexOf(withPrefix);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + withPrefix.length, entity });
    } else {
      idx = text.indexOf(entity.name);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + entity.name.length, entity });
      }
    }
  }

  if (!matches.length) return text;

  matches.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start >= lastEnd) {
      if (match.start > lastEnd) {
        parts.push(text.slice(lastEnd, match.start));
      }
      parts.push(
        <EntityBadge entity={match.entity} scopeId={scopeId} key={`entity-${match.start}`} />
      );
      lastEnd = match.end;
    }
  }

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <>{parts}</>;
};
