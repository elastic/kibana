/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_ENTITY,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
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
      scopeId?: string;
      onShowDocument?: (docId: string, indexName?: string, isEvent?: boolean) => void;
      onShowEntity?: (params: {
        engineType: string | undefined;
        entityId: string;
        entityName: string | undefined;
      }) => void;
    }
  | {
      isLoading?: false;
      item: EntityOrEventItem;
      /**
       * Unique identifier for the graph instance, used to scope filter state.
       */
      scopeId: string;
      /** Invoked to open the event/alert details preview for the clicked item. */
      onShowDocument: (docId: string, indexName?: string, isEvent?: boolean) => void;
      /** Invoked to open the entity details preview for the clicked item. */
      onShowEntity: (params: {
        engineType: string | undefined;
        entityId: string;
        entityName: string | undefined;
      }) => void;
    };

export const GroupedItem = memo(
  ({ item, isLoading, scopeId, onShowDocument, onShowEntity }: GroupedItemProps) => {
    if (isLoading) {
      return (
        <Panel grow={false}>
          <Skeleton />
        </Panel>
      );
    }

    return (
      <Panel isAlert={item.itemType === DOCUMENT_TYPE_ALERT}>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <HeaderRow
              item={item}
              scopeId={scopeId}
              onShowDocument={onShowDocument}
              onShowEntity={onShowEntity}
            />
          </EuiFlexItem>

          {item.timestamp && (
            <EuiFlexItem>
              <TimestampRow timestamp={item.timestamp} />
            </EuiFlexItem>
          )}

          {item.itemType !== DOCUMENT_TYPE_ENTITY && item.actor && item.target && (
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
  }
);

GroupedItem.displayName = 'GroupedItem';
