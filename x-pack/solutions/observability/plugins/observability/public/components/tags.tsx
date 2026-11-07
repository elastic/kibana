/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function Tags({
  tags,
  color,
  size = 3,
  oneLine = false,
}: {
  tags: string[];
  color?: string;
  size?: number;
  oneLine?: boolean;
}) {
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const onMoreTagsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsMoreTagsOpen((isPopoverOpen) => !isPopoverOpen);
  };
  const closePopover = () => setIsMoreTagsOpen(false);
  const extraTags = tags.slice(size);
  const moreTags =
    extraTags.length > 0 ? (
      <EuiBadge
        key="more"
        onClick={onMoreTagsClick}
        onClickAriaLabel={i18n.translate('xpack.observability.component.tags.moreTags.ariaLabel', {
          defaultMessage: 'more tags badge',
        })}
        color={color}
      >
        <FormattedMessage
          id="xpack.observability.component.tags.moreTags"
          defaultMessage="+{number} more"
          values={{ number: extraTags.length }}
        />
      </EuiBadge>
    ) : null;

  const moreTagsPopover = moreTags ? (
    <EuiPopover
      aria-label={i18n.translate('xpack.observability.component.tags.moreTagsPopoverAriaLabel', {
        defaultMessage: 'Additional tags',
      })}
      button={moreTags}
      isOpen={isMoreTagsOpen}
      closePopover={closePopover}
    >
      {extraTags.map((tag) => (
        <EuiBadge key={tag} color={color}>
          {tag}
        </EuiBadge>
      ))}
    </EuiPopover>
  ) : null;

  const visibleBadges = tags.slice(0, size).map((tag) => (
    <EuiBadge key={tag} color={color}>
      {tag}
    </EuiBadge>
  ));

  if (oneLine) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        {visibleBadges.map((badge) => (
          <EuiFlexItem grow={false} key={badge.key}>
            {badge}
          </EuiFlexItem>
        ))}
        {moreTagsPopover ? <EuiFlexItem grow={false}>{moreTagsPopover}</EuiFlexItem> : null}
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {visibleBadges}
      {moreTagsPopover ? (
        <>
          <br />
          {moreTagsPopover}
        </>
      ) : null}
    </>
  );
}
