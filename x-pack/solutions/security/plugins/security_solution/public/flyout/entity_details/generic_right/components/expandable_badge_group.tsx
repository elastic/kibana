/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiBadge, EuiBadgeGroup, EuiPopover } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ExpandableBadgeGroupProps {
  badges: EuiBadgeProps[];
  initialBadgeLimit?: number | 'all';
  maxHeight?: number;
}

export const ExpandableBadgeGroup = ({
  badges,
  initialBadgeLimit = 'all',
  maxHeight,
}: ExpandableBadgeGroupProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const visibleBadgesCount = initialBadgeLimit === 'all' ? badges.length : initialBadgeLimit;
  const remainingCount = badges.length - visibleBadgesCount;

  const visibleBadges = useMemo(
    () =>
      badges
        .slice(0, visibleBadgesCount)
        .map((badge, index) => <EuiBadge key={`visible-${index}`} {...badge} />),
    [badges, visibleBadgesCount]
  );

  const hiddenBadges = useMemo(
    () =>
      badges
        .slice(visibleBadgesCount)
        .map((badge, index) => <EuiBadge key={`hidden-${index}`} {...badge} />),
    [badges, visibleBadgesCount]
  );

  return (
    <EuiBadgeGroup gutterSize="s">
      {visibleBadges}

      {remainingCount > 0 && (
        <EuiPopover
          button={
            <EuiBadge
              color="hollow"
              onClick={togglePopover}
              onClickAriaLabel={i18n.translate(
                'xpack.securitySolution.expandableBadgeGroup.expandBadgeAriaLabel',
                { defaultMessage: 'Expand Remaining Badges' }
              )}
            >
              {`+${remainingCount}`}
            </EuiBadge>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downCenter"
        >
          <div
            style={{
              maxHeight: maxHeight ? `${maxHeight}px` : 'none',
              overflowY: maxHeight ? 'auto' : 'visible',
            }}
            css={{
              maxWidth: 700,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            {hiddenBadges}
          </div>
        </EuiPopover>
      )}
    </EuiBadgeGroup>
  );
};
