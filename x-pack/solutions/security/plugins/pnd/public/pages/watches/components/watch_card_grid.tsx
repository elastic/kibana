/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import { WatchCard } from './watch_card';
import * as i18n from '../translations';

interface WatchCardGridProps {
  watches: Watch[];
  onSelectWatch: (watchId: string) => void;
  onNewWatch?: () => void;
}

export const WatchCardGrid: React.FC<WatchCardGridProps> = ({
  watches,
  onSelectWatch,
  onNewWatch,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: ${euiTheme.size.base};
      `}
    >
      {watches.map((watch) => (
        <WatchCard key={watch.id} watch={watch} onSelect={onSelectWatch} />
      ))}
      <EuiPanel
        hasBorder
        paddingSize="m"
        onClick={onNewWatch}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNewWatch?.();
          }
        }}
        role="button"
        tabIndex={0}
        css={css`
          text-align: center;
          cursor: pointer;
          border-style: dashed;
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          &:hover {
            background: ${euiTheme.colors.lightestShade};
          }
        `}
        aria-label={i18n.NEW_WATCH_TITLE}
      >
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="plus" size="l" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{i18n.NEW_WATCH_TITLE}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.NEW_WATCH_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
