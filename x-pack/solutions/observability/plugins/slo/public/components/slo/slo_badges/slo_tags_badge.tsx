/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlexGroupGutterSize,
} from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

interface Props {
  slo: SLOWithSummaryResponse;
  gutterSize?: EuiFlexGroupGutterSize;
  onClick?: (tag: string) => void;
}

const DEFAULT_VISIBLE_TAGS = 3;

export function SloTagsBadge({ slo, gutterSize = 's', onClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const tags = slo.tags;
  const visibleTags = expanded ? tags : tags.slice(0, DEFAULT_VISIBLE_TAGS);
  const hasMore = tags.length > DEFAULT_VISIBLE_TAGS;

  if (!tags.length) return null;

  return (
    <EuiFlexGroup
      gutterSize={gutterSize}
      alignItems="center"
      wrap
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
    >
      {visibleTags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge onClickAriaLabel={`filter with ${tag}`} onClick={() => onClick?.(tag)}>
            {tag}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {hasMore && (
        <EuiFlexItem grow={false}>
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
                  values: { count: tags.length - DEFAULT_VISIBLE_TAGS },
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
