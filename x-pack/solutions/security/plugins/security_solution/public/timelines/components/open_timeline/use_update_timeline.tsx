/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import { PageScope } from '../../../data_view_manager/constants';
import { useSelectDataView } from '../../../data_view_manager/hooks/use_select_data_view';
import type { Note } from '../../../../common/api/timeline';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../../common/api/timeline';
import { createNote } from '../notes/helpers';

import { InputsModelId } from '../../../common/store/inputs/constants';
import {
  addNotes as dispatchAddNotes,
  updateNote as dispatchUpdateNote,
} from '../../../common/store/app/actions';
import {
  setRelativeRangeDatePicker as dispatchSetRelativeRangeDatePicker,
  setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker,
} from '../../../common/store/inputs/actions';
import {
  addNote as dispatchAddGlobalTimelineNote,
  addTimeline as dispatchAddTimeline,
  applyKqlFilterQuery as dispatchApplyKqlFilterQuery,
} from '../../store/actions';
import {
  DEFAULT_FROM_MOMENT,
  DEFAULT_TO_MOMENT,
} from '../../../common/utils/default_date_settings';
import type { UpdateTimeline } from './types';

export const useUpdateTimeline = () => {
  const dispatch = useDispatch();
  const selectDataView = useSelectDataView();

  return useCallback(
    // NOTE: this is only enabled for the data view picker test

    ({
      duplicate,
      id,
      forceNotes = false,
      from,
      notes,
      resolveTimelineConfig,
      timeline,
      to,
      ruleNote,
      ruleAuthor,
      preventSettingQuery,
    }: UpdateTimeline) => {
      let _timeline = timeline;
      if (duplicate) {
        // Reset the `updated` and `version` fields because a duplicated timeline has not been saved yet.
        // The `changed` field is set to true because the duplicated timeline needs to be saved.
        _timeline = { ...timeline, updated: undefined, changed: true, version: null };
      }

      selectDataView({
        id: _timeline.dataViewId,
        fallbackPatterns: _timeline.indexNames,
        scope: PageScope.timeline,
      });

      if (
        _timeline.status === TimelineStatusEnum.immutable &&
        _timeline.timelineType === TimelineTypeEnum.template
      ) {
        dispatch(
          dispatchSetRelativeRangeDatePicker({
            id: InputsModelId.timeline,
            fromStr: 'now-24h',
            toStr: 'now',
            from: DEFAULT_FROM_MOMENT.toISOString(),
            to: DEFAULT_TO_MOMENT.toISOString(),
          })
        );
      } else {
        dispatch(dispatchSetTimelineRangeDatePicker({ from, to }));
      }
      dispatch(
        dispatchAddTimeline({
          id,
          timeline: _timeline,
          resolveTimelineConfig,
          savedTimeline: duplicate,
        })
      );
      if (
        !preventSettingQuery &&
        _timeline.kqlQuery != null &&
        _timeline.kqlQuery.filterQuery != null &&
        _timeline.kqlQuery.filterQuery.kuery != null &&
        _timeline.kqlQuery.filterQuery.kuery.expression !== ''
      ) {
        dispatch(
          dispatchApplyKqlFilterQuery({
            id,
            filterQuery: {
              kuery: {
                kind: _timeline.kqlQuery.filterQuery.kuery.kind ?? 'kuery',
                expression: _timeline.kqlQuery.filterQuery.kuery.expression || '',
              },
              serializedQuery: _timeline.kqlQuery.filterQuery.serializedQuery || '',
            },
          })
        );
      }

      if (duplicate && ruleNote != null && !isEmpty(ruleNote)) {
        const newNote = createNote({ newNote: ruleNote, user: ruleAuthor || 'elastic' });
        dispatch(dispatchUpdateNote({ note: newNote }));
        dispatch(dispatchAddGlobalTimelineNote({ noteId: newNote.id, id }));
      }

      if (!duplicate || forceNotes) {
        dispatch(
          dispatchAddNotes({
            notes:
              notes != null
                ? notes.map((note: Note) => ({
                    created: note.created != null ? new Date(note.created) : new Date(),
                    id: note.noteId,
                    lastEdit: note.updated != null ? new Date(note.updated) : new Date(),
                    note: note.note || '',
                    user: note.updatedBy || 'unknown',
                    saveObjectId: note.noteId,
                    version: note.version,
                    eventId: note.eventId ?? null,
                    timelineId: note.timelineId ?? null,
                  }))
                : [],
          })
        );
      }
    },
    [dispatch, selectDataView]
  );
};
