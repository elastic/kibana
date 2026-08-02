/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { watchLabel } from '../../helpers/watch_label';
import type { UseWatchFilterResult } from '../../hooks/use_watch_filter';

export interface WatchFiltersProps
  extends Pick<UseWatchFilterResult, 'onWatchClick' | 'watchFilter' | 'workflowIds'> {
  /**
   * What the row is called. The queue says "Waiting on you from"; the history says "Answered
   * from" — same control, and the label is the only thing that makes it read as the right tense.
   */
  watchesLabel: string;
}

/**
 * Which watch asked — the one **real** filter left on the page, shared by the queue and the history.
 *
 * The phase pills that used to sit above this row are gone (D11): a phase is a section now, drawn
 * whether or not it holds anything, so filtering to one phase and having nothing to contain painted
 * the same picture. A watch is a different dimension entirely — it is not derivable from the
 * grouping, and an analyst who only wants the Detection Watch cannot get there by scrolling.
 *
 * Renders nothing when the rows carried no watch at all, which is the only case where the row would
 * be a heading over an empty list.
 */
export const WatchFilters: React.FC<WatchFiltersProps> = ({
  onWatchClick,
  watchesLabel,
  watchFilter,
  workflowIds,
}) =>
  workflowIds.length === 0 ? null : (
    <EuiFlexGroup
      alignItems="center"
      aria-label={watchesLabel}
      gutterSize="s"
      responsive={false}
      wrap
    >
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {watchesLabel}
        </EuiText>
      </EuiFlexItem>
      {workflowIds.map((workflowId) => (
        <EuiFlexItem grow={false} key={workflowId}>
          <EuiBadge
            color={watchFilter === workflowId ? 'primary' : 'hollow'}
            data-test-subj={`pndBriefWatchFilter-${workflowId}`}
            onClick={() => onWatchClick(workflowId)}
            onClickAriaLabel={watchLabel(workflowId)}
          >
            {watchLabel(workflowId)}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
