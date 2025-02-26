/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';

interface ExpandableBadgeGroupProps {
  /** Array of EuiBadges properties to display */
  badges: EuiBadgeProps[];
  /** The initial number of badges to show before expanding. Defaults to 'all' if not set */
  initialBadgeLimit?: number;
  /** The maximum height of the badge group in pixels. If not set the expandable container will not have inner scrolling */
  maxHeight?: number;
}

/**
 * A component that displays a group of badges with a limited initial display and an expansion option.
 *
 * The component initially shows a limited number of badges (or all if `initialBadgeLimit` is not set) and provides a "+n" badge to expand and show all badges.
 * The badge group is scrollable if the badges exceed the `maxHeight`.
 */
export const ExpandableBadgeGroup = ({
  badges,
  initialBadgeLimit,
  maxHeight,
}: ExpandableBadgeGroupProps) => {
  const [badgesToShow, setBadgesToShow] = useState<number | 'all'>(initialBadgeLimit || 'all');

  const remainingCount = badges.length - badgesToShow;
  const maxScrollHeight = maxHeight ? `${maxHeight}px` : 'initial';

  return (
    <EuiBadgeGroup
      gutterSize="s"
      css={css`
        max-height: ${maxScrollHeight};
        overflow-y: auto;
      `}
      responsive={false}
    >
      {badgesToShow === 'all' ? badges : badges.slice(0, badgesToShow)}
      {remainingCount > 0 && badgesToShow !== 'all' && (
        <EuiBadge
          color="hollow"
          onClick={() => setBadgesToShow('all')}
        >{`+${remainingCount}`}</EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};
