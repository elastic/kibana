/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { GROUPED_LIST_ITEM_TEST_ID, GROUPED_LIST_ITEM_SKELETON_TEST_ID } from '../../test_ids';

import { GroupedListItemSkeleton } from './parts/list_item_skeleton';
import { Panel } from './parts/panel';
import { HeaderRow } from './parts/header_row';
import { TimestampRow } from './parts/timestamp_row';
import { ActorsRow } from './parts/actors_row';
import { MetadataRow } from './parts/metadata_row';

import type { GroupedListItem as GroupedListItemRecord } from './types';

export type GroupedListItemProps =
  | {
      isLoading: true;
      item?: GroupedListItemRecord;
    }
  | {
      isLoading?: false;
      item: GroupedListItemRecord;
    };

export const GroupedListItem: React.FC<GroupedListItemProps> = memo(({ item, isLoading }) => {
  if (isLoading) {
    return (
      <Panel data-test-subj={GROUPED_LIST_ITEM_TEST_ID}>
        <GroupedListItemSkeleton data-test-subj={GROUPED_LIST_ITEM_SKELETON_TEST_ID} />
      </Panel>
    );
  }

  return (
    <Panel data-test-subj={GROUPED_LIST_ITEM_TEST_ID} isAlert={item.type === 'alert'}>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <HeaderRow item={item} />
        </EuiFlexItem>

        {item.timestamp && (
          <EuiFlexItem>
            <TimestampRow timestamp={item.timestamp} />
          </EuiFlexItem>
        )}

        {item.type !== 'entity' && item.actor && item.target && (
          <EuiFlexItem>
            <ActorsRow actor={item.actor} target={item.target} />
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <MetadataRow item={item} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Panel>
  );
});

GroupedListItem.displayName = 'GroupedListItem';
