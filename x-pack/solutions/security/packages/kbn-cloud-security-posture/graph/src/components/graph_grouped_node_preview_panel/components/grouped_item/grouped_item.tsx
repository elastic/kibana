/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EntityItem } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type { EventOrAlertItem } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { isEntityItem, isEventOrAlertItem } from '../../../utils';
import { Skeleton } from './parts/skeleton';
import { Panel } from './parts/panel';
import { HeaderRow } from './parts/header_row';
import { TimestampRow } from './parts/timestamp_row';
import { ActorsRow } from './parts/actors_row';
import { MetadataRow } from './parts/metadata_row';

export type GroupedItemProps =
  | {
      isLoading: true;
      item?: EntityItem | EventOrAlertItem;
    }
  | {
      isLoading?: false;
      item: EntityItem | EventOrAlertItem;
    };

export const GroupedItem = memo(({ item, isLoading }: GroupedItemProps) => {
  if (isLoading) {
    return (
      <Panel grow={false}>
        <Skeleton />
      </Panel>
    );
  }

  const isAlert = isEventOrAlertItem(item) && item.isAlert;
  const isEntity = isEntityItem(item);

  return (
    <Panel isAlert={isAlert}>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <HeaderRow item={item} />
        </EuiFlexItem>

        {item.timestamp && (
          <EuiFlexItem>
            <TimestampRow timestamp={item.timestamp} />
          </EuiFlexItem>
        )}

        {!isEntity && isEventOrAlertItem(item) && item.actor && item.target && (
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
