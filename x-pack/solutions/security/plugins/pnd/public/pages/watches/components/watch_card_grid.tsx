/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import { WatchCard } from './watch_card';

interface WatchCardGridProps {
  watches: Watch[];
  onSelectWatch: (watchId: string) => void;
}

/**
 * Responsive card grid. `grid-template-columns: repeat(auto-fill, …)` has no EUI equivalent —
 * `EuiFlexGrid` takes a fixed column count rather than reflowing to available width.
 */
export const WatchCardGrid: React.FC<WatchCardGridProps> = ({ watches, onSelectWatch }) => {
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
    </div>
  );
};
