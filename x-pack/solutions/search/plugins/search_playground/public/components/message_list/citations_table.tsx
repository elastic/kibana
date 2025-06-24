/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AIMessage as AIMessageType, Doc } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';

type CitationsTableProps = Pick<AIMessageType, 'citations'>;

export const CitationsTable: React.FC<CitationsTableProps> = ({ citations }) => {
  const usageTracker = useUsageTracker();
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});

  // Add an ID to each citation to use for expanding the row
  const citationsWithId = citations.map((citation) => ({
    ...citation,
    id: citation.metadata._id,
  }));

  const toggleDetails = (citation: Doc) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[citation.metadata._id]) {
      delete itemIdToExpandedRowMapValues[citation.metadata._id];

      usageTracker?.click(AnalyticsEvents.citationDetailsCollapsed);
    } else {
      itemIdToExpandedRowMapValues[citation.metadata._id] = (
        <EuiText size="s">{citation.content}</EuiText>
      );
      usageTracker?.click(AnalyticsEvents.citationDetailsExpanded);
    }

    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  return (
    <EuiBasicTable
      columns={[
        {
          field: 'metadata._id',
          name: i18n.translate('xpack.searchPlayground.chat.message.assistant.citations.idField', {
            defaultMessage: 'ID',
          }),
          truncateText: true,
        },
        {
          truncateText: false,
          align: 'right',
          isExpander: true,
          render: (citation: Doc) => {
            const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

            return (
              <EuiButtonEmpty
                iconSide="right"
                size="s"
                data-test-subj={`expandButton-${citation.metadata._id}`}
                onClick={() => toggleDetails(citation)}
                iconType={
                  itemIdToExpandedRowMapValues[citation.metadata._id] ? 'arrowDown' : 'arrowRight'
                }
              >
                {i18n.translate('xpack.searchPlayground.chat.message.assistant.citations.snippet', {
                  defaultMessage: 'Snippet',
                })}
              </EuiButtonEmpty>
            );
          },
        },
      ]}
      items={citationsWithId}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
    />
  );
};
