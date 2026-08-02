/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import type { PndConversation } from '@kbn/pnd-common';

import { countConversationsByKind } from '../../helpers/count_conversations_by_kind';
import * as i18n from '../../translations';

export interface ConversationKpiTilesProps {
  conversations: readonly PndConversation[];
  /** Zeroes render when a filter is active; the tiles hide when the list is genuinely empty. */
  isFilterActive?: boolean;
}

interface ConversationKpiTileSpec {
  count: number;
  id: 'all' | 'incident' | 'investigation' | 'thread';
  label: string;
}

/**
 * Four `EuiStat` tiles over the chats list: all PND chats, investigations,
 * incidents, sub-investigations. No trend arrows — there is no time series to
 * compare against.
 *
 * Zero-state: zeroes render when a filter is active; nothing renders when the
 * list is genuinely empty.
 */
export const ConversationKpiTiles: React.FC<ConversationKpiTilesProps> = ({
  conversations,
  isFilterActive = false,
}) => {
  const byKind = useMemo(() => countConversationsByKind([...conversations]), [conversations]);

  const tiles: readonly ConversationKpiTileSpec[] = useMemo(
    () => [
      { count: conversations.length, id: 'all', label: i18n.KPI_ALL_CHATS },
      { count: byKind.investigation, id: 'investigation', label: i18n.KPI_INVESTIGATIONS },
      { count: byKind.incident, id: 'incident', label: i18n.KPI_INCIDENTS },
      { count: byKind.thread, id: 'thread', label: i18n.KPI_SUB_INVESTIGATIONS },
    ],
    [byKind, conversations.length]
  );

  if (conversations.length === 0 && !isFilterActive) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="stretch"
      data-test-subj="pndChatsKpiTiles"
      gutterSize="m"
      responsive={false}
    >
      {tiles.map(({ count, id, label }) => (
        <EuiFlexItem grow={1} key={id}>
          <EuiStat
            data-test-subj={`pndChatsKpiTile-${id}`}
            description={label}
            textAlign="left"
            title={<span data-test-subj={`pndChatsKpiTileCount-${id}`}>{count}</span>}
            titleSize="s"
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
