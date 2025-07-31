/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';

interface Props {
  slo: SLOWithSummaryResponse;
  onClick?: (tag: string) => void;
  defaultVisibleTags?: number;
}

const DEFAULT_VISIBLE_TAGS = 3;

export function SloTagsBadge({ slo, onClick, defaultVisibleTags = DEFAULT_VISIBLE_TAGS }: Props) {
  const [expanded, setExpanded] = useState(false);
  const tags = slo.tags;
  const visibleTags = expanded ? tags : tags.slice(0, defaultVisibleTags);
  const hasMore = tags.length > defaultVisibleTags;

  const getClickProps = (tag: string) => {
    return onClick !== undefined
      ? {
          onClickAriaLabel: i18n.translate('xpack.slo.sloTagsBadge.ariaLabel', {
            defaultMessage: 'Filter with {tag}',
            values: { tag },
          }),
          onClick: () => onClick(tag),
        }
      : {};
  };

  if (!tags.length) return null;

  return (
    <>
      {visibleTags.map((tag) => (
        <EuiFlexItem
          grow={false}
          key={tag}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        >
          <EuiBadge {...getClickProps(tag)}>{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
      {hasMore && (
        <EuiFlexItem
          grow={false}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        >
          <EuiButtonEmpty
            size="xs"
            color="text"
            onClick={() => setExpanded((v) => !v)}
            data-test-subj="sloTagsBadgeToggle"
          >
            {expanded
              ? i18n.translate('xpack.slo.sloTagsBadge.showLess', {
                  defaultMessage: 'Show less',
                })
              : i18n.translate('xpack.slo.sloTagsBadge.showMore', {
                  defaultMessage: '+{count} more',
                  values: { count: tags.length - defaultVisibleTags },
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </>
  );
}
