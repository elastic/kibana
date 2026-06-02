/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { ChangeHistoryItem } from './change_history_item';
import { TrackingStartedFooter } from './change_history_footer';
import * as i18n from './translations';

interface ChangeHistoryTimelineProps {
  items: RuleHistoryItem[];
  selectedItem?: RuleHistoryItem;
  startedAt?: Date;
  isLoading?: boolean;
  onSelectItem?: (item: RuleHistoryItem) => void;
  /**
   * Requests loading more data
   */
  onLoadMore: () => void;
}

export function RuleChangesHistoryTimeline({
  items,
  selectedItem,
  startedAt,
  isLoading,
  onSelectItem,
  onLoadMore,
}: ChangeHistoryTimelineProps): JSX.Element {
  const hasAutoSelectedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auto-select the first item
  useEffect(() => {
    if (hasAutoSelectedRef.current || items.length === 0) {
      return;
    }

    hasAutoSelectedRef.current = true;
    onSelectItem?.(items[0]);
  }, [items, onSelectItem]);

  // Track scrolling to load more items
  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [onLoadMore]);

  if (items.length === 0 && isLoading) {
    return <Loading />;
  }

  if (items.length === 0) {
    return <NoData />;
  }

  return (
    <div
      data-test-subj="ruleChangeHistory"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        style={{ flex: '1 1 0', overflowY: 'auto', minHeight: 0 }}
        aria-label={i18n.TIMELINE_ARIA_LABEL}
        data-test-subj="ruleChangeHistoryList"
      >
        {items.map((item) => (
          <ChangeHistoryItem
            key={item.id}
            item={item}
            selected={selectedItem?.id === item.id}
            onClick={() => onSelectItem?.(item)}
          />
        ))}
        <div ref={sentinelRef} />
        {isLoading && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        <EuiSpacer size="s" />
      </div>
      {startedAt && <TrackingStartedFooter startedAt={startedAt} />}
    </div>
  );
}

function Loading(): JSX.Element {
  return (
    <EuiPanel hasBorder data-test-subj="ruleChangeHistoryTableLoading">
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18n.LOADING_LABEL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function NoData(): JSX.Element {
  return (
    <EuiPanel hasBorder data-test-subj="ruleChangeHistoryTableEmpty">
      <EuiEmptyPrompt
        iconType="clock"
        title={<h2>{i18n.EMPTY_PROMPT_TITLE}</h2>}
        body={<p>{i18n.EMPTY_PROMPT_BODY}</p>}
      />
    </EuiPanel>
  );
}
