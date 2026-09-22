/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';

/**
 * A group of hollow badges, one per item, shared by the tactics/regions/categories lists in the
 * threat renderer and the tactic-id column in the SSE tier-2 table. When `getHref` is provided
 * and returns a value for an item, that badge becomes a link (used for MITRE technique ids).
 */
export const HollowBadgeList: React.FC<{
  items: string[];
  getHref?: (item: string) => string | undefined;
}> = ({ items, getHref }) => (
  <EuiBadgeGroup gutterSize="xs">
    {items.map((item) => {
      const href = getHref?.(item);
      return href ? (
        <EuiBadge
          key={item}
          color="hollow"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          iconType="external"
          iconSide="right"
        >
          {item}
        </EuiBadge>
      ) : (
        <EuiBadge key={item} color="hollow">
          {item}
        </EuiBadge>
      );
    })}
  </EuiBadgeGroup>
);
