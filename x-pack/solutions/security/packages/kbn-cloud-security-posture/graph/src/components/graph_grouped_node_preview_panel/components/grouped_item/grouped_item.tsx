/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Skeleton } from './parts/skeleton';
import { Panel } from './parts/panel';
import { HeaderRow } from './parts/header_row';
import { TimestampRow } from './parts/timestamp_row';
import { ActorsRow } from './parts/actors_row';
import { MetadataRow } from './parts/metadata_row';
import type { EntityOrEventItem } from './types';

export type GroupedItemProps =
  | {
      isLoading: true;
      item?: EntityOrEventItem;
    }
  | {
      isLoading?: false;
      item: EntityOrEventItem;
    };

export const GroupedItem = memo(({ item, isLoading }: GroupedItemProps) => {
  if (isLoading) {
    return (
      <Panel>
        <Skeleton />
      </Panel>
    );
  }

  return (
    <Panel isAlert={item.type === 'alert'}>
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

GroupedItem.displayName = 'GroupedItem';
