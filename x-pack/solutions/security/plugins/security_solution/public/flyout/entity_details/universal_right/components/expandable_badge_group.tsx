/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ExpandableBadgeGroupProps {
  /** Array of EuiBadges to display */
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

  // Calculate the number of remaining badges. If 'all' badges are shown, the remaining count is 0.
  const remainingCount = badgesToShow === 'all' ? 0 : badges.length - badgesToShow;
  const maxScrollHeight = maxHeight ? `${maxHeight}px` : 'initial';

  const badgeElements = useMemo(
    () => badges.map((badge, index) => <EuiBadge key={index} {...badge} />),
    [badges]
  );

  return (
    <EuiBadgeGroup
      gutterSize="s"
      css={css`
        max-height: ${maxScrollHeight};
        overflow-y: auto;
      `}
    >
      {
        // Show all badges if 'all' is set, otherwise show the first `badgesToShow` badges
        badgesToShow === 'all' ? badgeElements : badgeElements.slice(0, badgesToShow)
      }
      {
        // Show the expand badge if there are remaining badges to show
        remainingCount > 0 && badgesToShow !== 'all' && (
          <EuiBadge
            color="hollow"
            onClick={() => setBadgesToShow('all')}
            onClickAriaLabel={i18n.translate(
              'xpack.securitySolution.expandableBadgeGroup.expandBadgeAriaLabel',
              { defaultMessage: 'Expand Remaining Badges' }
            )}
          >{`+${remainingCount}`}</EuiBadge>
        )
      }
    </EuiBadgeGroup>
  );
};
