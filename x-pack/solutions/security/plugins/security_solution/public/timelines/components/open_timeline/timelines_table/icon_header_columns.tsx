/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiIconTip } from '@elastic/eui';
import type { EuiTableFieldDataColumnType, HorizontalAlignment } from '@elastic/eui';
import React from 'react';

import { ACTION_COLUMN_WIDTH } from './common_styles';
import { getNotesCount, getPinnedEventCount } from '../helpers';
import * as i18n from '../translations';
import {
  ESQL_SUPER_TIMELINE_INCOMPATIBLE,
  EQL_SUPER_TIMELINE_INCOMPATIBLE,
  SUPER_TIMELINE_QUERY_TYPE_COLUMN_HEADER,
} from '../../super_timeline/translations';
import type { FavoriteTimelineResult, OpenTimelineResult } from '../types';
import { type TimelineType, TimelineTypeEnum } from '../../../../../common/api/timeline';

/**
 * Returns the columns that have icon headers
 */
export const getIconHeaderColumns = ({
  timelineType,
}: {
  timelineType: TimelineType | null;
}): Array<EuiTableFieldDataColumnType<object>> => {
  const columns = {
    note: {
      align: 'center' as HorizontalAlignment,
      field: 'eventIdToNoteIds',
      name: (
        <EuiIconTip
          content={i18n.NOTES}
          iconProps={{
            'data-test-subj': 'notes-count-header-icon',
          }}
          size="m"
          type="comment"
        />
      ),
      render: (
        _: Record<string, string[]> | null | undefined,
        timelineResult: OpenTimelineResult
      ) => <span data-test-subj="notes-count">{getNotesCount(timelineResult)}</span>,
      sortable: false,
      width: ACTION_COLUMN_WIDTH,
    },
    pinnedEvent: {
      align: 'center' as HorizontalAlignment,
      field: 'pinnedEventIds',
      name: (
        <EuiIconTip
          content={i18n.PINNED_EVENTS}
          iconProps={{
            'data-test-subj': 'pinned-event-header-icon',
          }}
          size="m"
          type="pin"
        />
      ),
      render: (
        _: Record<string, boolean> | null | undefined,
        timelineResult: OpenTimelineResult
      ) => (
        <span data-test-subj="pinned-event-count">{`${getPinnedEventCount(timelineResult)}`}</span>
      ),
      sortable: false,
      width: ACTION_COLUMN_WIDTH,
    },
    favorite: {
      align: 'center' as HorizontalAlignment,
      field: 'favorite',
      name: (
        <EuiIconTip
          content={i18n.FAVORITES}
          iconProps={{
            'data-test-subj': 'favorites-header-icon',
          }}
          size="m"
          type="star"
        />
      ),
      render: (favorite: FavoriteTimelineResult[] | null | undefined) => {
        const isFavorite = favorite != null && favorite.length > 0;
        const fill = isFavorite ? 'starFill' : 'star';

        return (
          <EuiIcon
            data-test-subj={`favorite-${fill}-star`}
            type={fill}
            size="m"
            aria-hidden={true}
          />
        );
      },
      sortable: false,
      width: ACTION_COLUMN_WIDTH,
    },
  };
  const templateColumns = [columns.note, columns.favorite];
  const defaultColumns = [columns.pinnedEvent, columns.note, columns.favorite];
  return timelineType === TimelineTypeEnum.template ? templateColumns : defaultColumns;
};

/** Returns the column that flags ES|QL and EQL timelines as incompatible with Super Timeline. */
export const getSuperTimelineQueryTypeColumn = (): EuiTableFieldDataColumnType<object> => ({
  align: 'center' as HorizontalAlignment,
  field: 'savedSearchId',
  name: (
    <EuiIconTip
      content={SUPER_TIMELINE_QUERY_TYPE_COLUMN_HEADER}
      iconProps={{ 'data-test-subj': 'super-timeline-query-type-header-icon' }}
      size="m"
      type="merge"
    />
  ),
  render: (savedSearchId: string | null | undefined, timelineResult: OpenTimelineResult) => {
    if (savedSearchId != null) {
      return (
        <EuiIconTip
          iconProps={{ 'data-test-subj': 'super-timeline-esql-incompatible-icon' }}
          content={ESQL_SUPER_TIMELINE_INCOMPATIBLE}
          type="warning"
          color="warning"
          size="m"
        />
      );
    }
    if (timelineResult.queryType?.hasEql === true) {
      return (
        <EuiIconTip
          iconProps={{ 'data-test-subj': 'super-timeline-eql-incompatible-icon' }}
          content={EQL_SUPER_TIMELINE_INCOMPATIBLE}
          type="warning"
          color="warning"
          size="m"
        />
      );
    }
    return null;
  },
  sortable: false,
  width: ACTION_COLUMN_WIDTH,
});
