/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiBadgeProps } from '@elastic/eui/src/components/badge/badge';

export interface TagsListProps {
  onClick?: (tag: string) => void;
  tags?: string[];
  numberOfTagsToDisplay?: number;
  color?: EuiBadgeProps['color'];
  ignoreEmpty?: boolean;
  disableExpand?: boolean;
  prependChildren?: React.ReactNode;
}

const MININUM_TAGS_TO_DISPLAY = 3;

const getFilterLabel = (tag: string) => {
  return i18n.translate('xpack.observabilityShared.getFilterLabel.filter', {
    defaultMessage: 'Click to filter list with tag {tag}',
    values: {
      tag,
    },
  });
};

const TagsList = ({
  ignoreEmpty,
  tags,
  numberOfTagsToDisplay = MININUM_TAGS_TO_DISPLAY,
  onClick,
  color = 'hollow',
  disableExpand = false,
  prependChildren,
}: TagsListProps) => {
  const [toDisplay, setToDisplay] = useState(numberOfTagsToDisplay);

  if (!tags || tags.length === 0) {
    if (ignoreEmpty) {
      return null;
    }
    return (
      <EuiText>
        {i18n.translate('xpack.observabilityShared.tagsList.TextLabel', { defaultMessage: '--' })}
      </EuiText>
    );
  }

  const tagsToDisplay = tags.slice(0, toDisplay);

  return (
    <EuiFlexGroup wrap gutterSize="xs" css={{ maxWidth: 400 }} alignItems="center">
      {prependChildren}
      {tagsToDisplay.map((tag) => (
        // filtering only makes sense in monitor list, where we have summary
        <EuiFlexItem key={tag} grow={false}>
          {onClick ? (
            <EuiBadge
              key={tag}
              title={getFilterLabel(tag)}
              onClick={() => {
                onClick(tag);
              }}
              onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation(); // stops propagation of metric onElementClick
              }}
              onClickAriaLabel={getFilterLabel(tag)}
              color={color}
              className="eui-textTruncate"
              css={{ maxWidth: 120 }}
            >
              {tag}
            </EuiBadge>
          ) : (
            <EuiBadge key={tag} color={color} className="eui-textTruncate" css={{ maxWidth: 120 }}>
              {tag}
            </EuiBadge>
          )}
        </EuiFlexItem>
      ))}
      {tags.length > toDisplay && (
        <EuiFlexItem key={tags.length - toDisplay} grow={false}>
          <EuiToolTip
            content={
              <>
                {tags.slice(toDisplay, tags.length).map((tag) => (
                  <EuiText key={tag} size="s">
                    {tag}
                  </EuiText>
                ))}
              </>
            }
          >
            <EuiButtonEmpty
              size="xs"
              onClick={() => {
                if (disableExpand) {
                  return;
                }
                setToDisplay(tags.length);
              }}
              onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation(); // stops propagation of metric onElementClick
              }}
              aria-label={EXPAND_TAGS_LABEL}
              data-test-subj="expand-tags"
            >
              {i18n.translate('xpack.observabilityShared.tagsList.showMore', {
                defaultMessage: '+ {count} more',
                values: { count: tags.length - toDisplay },
              })}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {toDisplay > MININUM_TAGS_TO_DISPLAY && (
        <EuiFlexItem key={tags.length - MININUM_TAGS_TO_DISPLAY} grow={false}>
          <EuiToolTip content={COLLAPSE_TAGS_LABEL} key={toDisplay}>
            <EuiButtonEmpty
              size="xs"
              onClick={() => {
                setToDisplay(MININUM_TAGS_TO_DISPLAY);
              }}
              onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation(); // stops propagation of metric onElementClick
              }}
              aria-label={COLLAPSE_TAGS_LABEL}
              data-test-subj="collapse-tags"
            >
              {i18n.translate('xpack.observabilityShared.tagsList.showLess', {
                defaultMessage: 'Show less',
              })}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default TagsList;

const EXPAND_TAGS_LABEL = i18n.translate('xpack.observabilityShared.tagsList.expand', {
  defaultMessage: 'Click to view remaining tags',
});

const COLLAPSE_TAGS_LABEL = i18n.translate('xpack.observabilityShared.tagsList.collapse', {
  defaultMessage: 'Click to collapse tags',
});
