/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRow } from '../types';

/**
 * A calm, neutral entity glyph. Type is encoded by shape + icon (host = rounded
 * square + monitor, service = gear, user = circle + initials), NOT by color —
 * color in this table is reserved for genuine risk signal, so avatars stay
 * quiet subdued tokens and never compete with the data.
 */
export const EntityAvatar: React.FC<{ row: EntityRow; size?: number }> = ({ row, size = 24 }) => {
  const { euiTheme } = useEuiTheme();

  const isHost = row.type === EntityType.host && !row.isService;
  const style = css`
    width: ${size}px;
    height: ${size}px;
    flex: none;
    border-radius: ${isHost ? euiTheme.border.radius.small : '50%'};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
    color: ${euiTheme.colors.textSubdued};
    font-size: ${Math.round(size * 0.4)}px;
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const initials = row.base.name
    .split(/[.\s_@-]/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <span css={style} aria-hidden="true">
      {row.isService ? (
        <EuiIcon type="gear" size="s" color="subdued" aria-hidden={true} />
      ) : isHost ? (
        <EuiIcon type="storage" size="s" color="subdued" aria-hidden={true} />
      ) : (
        initials
      )}
    </span>
  );
};
